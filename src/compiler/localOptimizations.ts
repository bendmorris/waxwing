import * as babelTypes from '@babel/types';
import babelTraverse from '@babel/traverse';
import { Ast } from '../ast';
import { Effect, EffectType } from '../effect';
import { Scope } from '../scope';
import { ValueType, abstractValue, unknownValue } from '../value';
import { ExecutionContext } from './context';
import { evaluate } from './evaluate';
import { knownValue, anyToNode, evalValue, valueToNode, sameLocation } from './utils';

function applyEffects(ctx: ExecutionContext, ast: Ast, effects: Effect[]) {
    const currentScope = ctx.scopes[ctx.scopes.length - 1];
    for (const effect of effects || []) {
        switch (effect.kind) {
            case EffectType.Define:
                const value = evalValue(ctx, effect.value);
                switch (value.kind) {
                    case ValueType.Concrete:
                        ctx.debugLog(ast, "updated the value of " + effect.name + " to " + JSON.stringify(value.value));
                        currentScope.createRef(effect.name, value);
                        break;
                    default:
                        ctx.debugLog(ast, "I don't know the value of " + effect.name);
                        currentScope.createRef(effect.name, unknownValue());
                }
        }
    }
}

function gcRefs(node: babelTypes.BlockStatement, scope: Scope) {
    for (let i = 0; i < node.body.length; ++i) {
        const statement = node.body[i];
        if (babelTypes.isVariableDeclaration(statement)) {
            for (let j = 0; j < statement.declarations.length; ++j) {
                const decl = statement.declarations[j];
                if (babelTypes.isIdentifier(decl.id)) {
                    const id = decl.id.name;
                    if (scope.has(id) && scope.get(id).refCount <= 0) {
                        statement.declarations.splice(j--, 1);
                    }
                }
            }
            if (statement.declarations.length === 0) {
                node.body.splice(i--, 1);
            }
        } else if (babelTypes.isFunctionDeclaration(statement)) {
            const id = statement.id.name;
            if (scope.has(id) && scope.get(id).refCount <= 0) {
                node.body.splice(i--, 1);
            }
        }/* else if (babelTypes.isAssignmentExpression(statement) && babelTypes.isIdentifier(statement.left)) {
            const id = statement.left.name;
            if (scope.has(id) && scope.get(id).refCount <= 0) {
                node.body.splice(i--, 1);
            }
        }*/
    }
}

export default function optimizeLocal(ctx: ExecutionContext, ast: Ast) {
    // TODO: if we're optimizing for size, we shouldn't simplify expressions that increase code size;
    // unfortunately this depends on minification
    babelTraverse(ast, {
        enter(path) {
            switch (path.node.type) {
                case "FunctionDeclaration":
                case "FunctionExpression":
                    ctx.debugLog(path.node, "starting function scope");
                    // add a new scope and populate with abstract args
                    const functionScope = new Scope();
                    for (const arg of path.node.params) {
                        if (babelTypes.isIdentifier(arg)) {
                            functionScope.createRef(arg.name, abstractValue(arg));
                        }
                    }
                    ctx.scopes.push(functionScope);
                    break;
                case "BlockStatement":
                    ctx.debugLog(path.node, "starting block scope");
                    ctx.scopes.push(new Scope());
            }

            applyEffects(ctx, path.node, (path.node as Ast).enterEffects);
        },

        exit(path) {
            ctx.debugLog(path.node, "exiting: " + path);
            switch (path.node.type) {
                case "BlockStatement":
                case "FunctionDeclaration":
                case "FunctionExpression":
                    ctx.debugLog(path.node, "leaving scope");
                    const leavingScope = ctx.scopes.pop();
                    if (babelTypes.isBlockStatement(path.node)) {
                        gcRefs(path.node, leavingScope);
                        const parent = path.parent;
                        if (babelTypes.isBlockStatement(parent) || babelTypes.isProgram(parent)) {
                            // clean up unnecessary blocks
                            if (path.node.body.length === 0) {
                                ctx.debugLog(path.node, "removing empty block statement");
                                path.remove();
                            } else if (path.node.body.length === 1) {
                                ctx.debugLog(path.node, "collapsing block statement with one member");
                                path.replaceWith(path.node.body[0]);
                            }
                        }
                    }
                    break;

                default: {
                    let shouldEvaluate = true;
                    switch (path.node.type) {
                        case "Identifier":
                            shouldEvaluate = (
                                babelTypes.isExpression(path.parent) &&
                                !(babelTypes.isAssignmentExpression(path.parent) && sameLocation(path.node.loc, path.parent.left.loc))
                            );
                            ctx.debugLog(path.node, "this is an identifier, and I decided " + (shouldEvaluate ? "TO evaluate" : "NOT TO evaluate"));
                            break;
                    }
                    if (shouldEvaluate) {
                        const evaluated = evaluate(ctx, path.node);
                        if (evaluated) {
                            path.replaceWith(evaluated);
                        } else if (evaluated === null) {
                            path.remove();
                        }
                    }
                }
            }

            if (path.node) {
                applyEffects(ctx, path.node, (path.node as Ast).exitEffects);
            }
        }
    });
}
