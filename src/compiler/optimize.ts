import * as t from '@babel/types';
import babelTraverse from '@babel/traverse';
import { Ast } from '../ast';
import { Effect, EffectType } from '../effect';
import { Scope } from '../scope';
import { ValueType, abstractValue, unknownValue, concreteValue } from '../value';
import { ExecutionContext } from './context';
import { eliminateDeadCodeFromBlock } from './dce';
import { evaluate, evalValue, knownValue } from './evaluate';
import { replaceWith, valueToNode } from './utils';

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

export default function optimize(ctx: ExecutionContext, ast: Ast) {
    // TODO: if we're optimizing for size, we shouldn't simplify expressions that increase code size;
    babelTraverse(ast, {
        enter(path) {
            const ast: Ast = path.node;
            switch (ast.type) {
                case "FunctionDeclaration":
                case "FunctionExpression":
                    ctx.log.chatty(ast, "starting function scope");
                    // add a new scope and populate with abstract args
                    const functionScope = new Scope();
                    for (const arg of ast.params) {
                        if (t.isIdentifier(arg)) {
                            functionScope.createRef(arg.name, abstractValue(arg));
                        }
                    }
                    ctx.scopes.push(functionScope);
                    break;
                case "BlockStatement":
                    ctx.log.chatty(ast, "starting block scope");
                    ctx.scopes.push(new Scope());
            }

            applyEffects(ctx, ast, ast.enterEffects);
        },

        exit(path) {
            const ast: Ast = path.node;
            ctx.log.chatty(ast, "exiting");
            switch (ast.type) {
                case "BlockStatement":
                case "FunctionDeclaration":
                case "FunctionExpression": {
                    ctx.log.chatty(ast, "leaving scope");
                    const leavingScope = ctx.scopes.pop();
                    if (t.isBlockStatement(ast)) {
                        eliminateDeadCodeFromBlock(ctx, ast, leavingScope);
                        const parent = path.parent;
                        if (t.isBlockStatement(parent) || t.isProgram(parent)) {
                            // clean up unnecessary blocks
                            if (ast.body.length === 0) {
                                ctx.log.log(ast, "removing empty block statement");
                                path.remove();
                            } else if (ast.body.length === 1) {
                                ctx.log.log(ast, "collapsing block statement with one member");
                                replaceWith(path, ast.body[0]);
                            }
                        }
                    }
                    break;
                }
                case "IfStatement": {
                    let test;
                    if ((test = knownValue(ctx, ast.test as Ast)) && test.kind === ValueType.Concrete) {
                        if (test.value) {
                            replaceWith(path, ast.consequent);
                        } else if (ast.alternate !== null) {
                            replaceWith(path, ast.alternate);
                        } else {
                            path.remove();
                        }
                    }
                    break;
                }
                case "Identifier": {
                    if (t.isExpression(path.parent) && !(
                        (t.isAssignmentExpression(path.parent) && ast == path.parent.left) ||
                        (t.isFunctionExpression(path.parent)) ||
                        (t.isMemberExpression(path.parent) && ast == path.parent.property)))
                    {
                        const binding = ctx.resolve(ast.name);
                        if (binding) {
                            ast.resolution = binding;
                            ast.knownValue = binding.value;
                            binding.addRef();
                        }
                    }
                    break;
                }

                default: {
                    if (t.isExpression(ast)) {
                        const evaluated = evaluate(ctx, ast);
                        if (evaluated) {
                            ast.knownValue = knownValue(ctx, evaluated) || abstractValue(evaluated);
                            replaceWith(path, valueToNode(ast.knownValue));
                        }
                    }
                }
            }

            if (path.node) {
                applyEffects(ctx, ast, ast.exitEffects);
            }
        }
    });
}
