import * as t from '@babel/types';
import babelTraverse from '@babel/traverse';
import { Ast } from '../ast';
import { Effect, EffectType } from '../effect';
import { Scope } from '../scope';
import { ValueType, abstractValue, unknownValue } from '../value';
import { ExecutionContext } from './context';
import { eliminateDeadCodeFromBlock } from './dce';
import { evaluate, evalValue, knownValue } from './evaluate';
import { anyToNode, sameLocation } from './utils';

function applyEffects(ctx: ExecutionContext, ast: Ast, effects: Effect[]) {
    const currentScope = ctx.scopes[ctx.scopes.length - 1];
    for (const effect of effects || []) {
        switch (effect.kind) {
            case EffectType.Define:
                const value = evalValue(ctx, effect.value);
                switch (value.kind) {
                    case ValueType.Concrete:
                        ctx.log.info(ast, "updated the value of " + effect.name + " to " + JSON.stringify(value.value));
                        currentScope.createRef(effect.name, value);
                        break;
                    default:
                        ctx.log.info(ast, "I don't know the value of " + effect.name + ": " + JSON.stringify(value));
                        currentScope.createRef(effect.name, unknownValue());
                }
        }
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
                    ctx.log.chatty(path.node, "starting function scope");
                    // add a new scope and populate with abstract args
                    const functionScope = new Scope();
                    for (const arg of path.node.params) {
                        if (t.isIdentifier(arg)) {
                            functionScope.createRef(arg.name, abstractValue(arg));
                        }
                    }
                    ctx.scopes.push(functionScope);
                    break;
                case "BlockStatement":
                    ctx.log.chatty(path.node, "starting block scope");
                    ctx.scopes.push(new Scope());
            }

            applyEffects(ctx, path.node, (path.node as Ast).enterEffects);
        },

        exit(path) {
            ctx.log.chatty(path.node, "exiting: " + path);
            switch (path.node.type) {
                case "BlockStatement":
                case "FunctionDeclaration":
                case "FunctionExpression": {
                    ctx.log.chatty(path.node, "leaving scope");
                    const leavingScope = ctx.scopes.pop();
                    if (t.isBlockStatement(path.node)) {
                        eliminateDeadCodeFromBlock(ctx, path.node, leavingScope);
                        const parent = path.parent;
                        if (t.isBlockStatement(parent) || t.isProgram(parent)) {
                            // clean up unnecessary blocks
                            if (path.node.body.length === 0) {
                                ctx.log.log(path.node, "removing empty block statement");
                                path.remove();
                            } else if (path.node.body.length === 1) {
                                ctx.log.log(path.node, "collapsing block statement with one member");
                                path.replaceWith(path.node.body[0]);
                            }
                        }
                    }
                    break;
                }
                case "MemberExpression": {
                    if (path.node.property.name === 'length') {
                        // special case for arrays and strings
                        const evaluated = knownValue(ctx, path.node);
                        if (evaluated && evaluated.kind === ValueType.Concrete) {
                            ctx.log.log(path.node, "substituting known value length");
                            const subst = anyToNode(evaluated.value.length);
                            if (subst) {
                                path.replaceWith(subst);
                            }
                        }
                    }
                }

                default: {
                    let shouldEvaluate = true;
                    switch (path.node.type) {
                        case "Identifier":
                            shouldEvaluate = (
                                t.isExpression(path.parent) &&
                                !(t.isAssignmentExpression(path.parent) && sameLocation(path.node.loc, path.parent.left.loc)) &&
                                !(t.isFunctionExpression(path.parent))
                            );
                            break;
                    }
                    if (shouldEvaluate) {
                        const evaluated = evaluate(ctx, path.node);
                        if (evaluated) {
                            ctx.log.info(path.node, "evaluated and found a value to replace");
                            path.replaceWith(evaluated);
                        } else if (evaluated === null) {
                            ctx.log.info(path.node, "evaluated and can remove");
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
