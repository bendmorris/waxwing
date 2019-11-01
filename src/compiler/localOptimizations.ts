import * as babelTypes from '@babel/types';
import babelTraverse from '@babel/traverse';
import { Ast } from '../ast';
import { Effect, EffectType } from '../effect';
import Scope from '../scope';
import { ValueType } from '../value';
import { ExecutionContext } from './context';
import { knownValue, anyToNode, evalValue, valueToNode } from './utils';


const binOps = {
    "*": (a, b) => a * b,
    "/": (a, b) => a / b,
    "%": (a, b) => a % b,
    "+": (a, b) => a + b,
    "-": (a, b) => a - b,
    "&": (a, b) => a & b,
    "|": (a, b) => a | b,
    "^": (a, b) => a ^ b,
    "&&": (a, b) => a && b,
    "||": (a, b) => a || b,
    "<<": (a, b) => a << b,
    ">>": (a, b) => a >> b,
    ">>>": (a, b) => a >>> b,
    "<": (a, b) => a < b,
    ">": (a, b) => a > b,
    "<=": (a, b) => a <= b,
    ">=": (a, b) => a >= b,
    "in": (a, b) => a in b,
    "==": (a, b) => a == b,
    "!=": (a, b) => a != b,
    "===": (a, b) => a === b,
    "!==": (a, b) => a !== b,
}

const unOps = {
    "!": (a) => !a,
    "~": (a) => ~a,
    "+": (a) => +a,
    // ignore -, used with literals and generally not worth simplifying
}

function optimizeBinop(ctx: ExecutionContext, ast: Ast, path) {
    let left, right;
    if (binOps[path.node.operator] && (left = knownValue(ctx, path.node.left as Ast)) && (right = knownValue(ctx, path.node.right as Ast)) && left.kind === ValueType.Concrete && right.kind === ValueType.Concrete) {
        const result = binOps[path.node.operator](left.value, right.value);
        const resultValue = anyToNode(result);
        if (resultValue) {
            path.replaceWith(resultValue);
        }
    }
}

function applyEffects(ctx: ExecutionContext, effects: Effect[]) {
    const currentScope = ctx.scopes[ctx.scopes.length - 1];
    for (const effect of effects || []) {
        switch (effect.kind) {
            case EffectType.Define:
                const value = evalValue(ctx, effect.value);
                currentScope.set(effect.name, value);
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
                    // add a new scope and populate with abstract args
                    const functionScope = new Scope();
                    for (const arg of path.node.params) {
                        if (babelTypes.isIdentifier(arg)) {
                            functionScope.set(arg.name, { kind: ValueType.Abstract, ast: arg as Ast });
                        }
                    }
                    ctx.scopes.push(functionScope);
                    break;
                case "BlockStatement":
                    ctx.scopes.push(new Scope());
            }

            applyEffects(ctx, (path.node as Ast).enterEffects);
        },

        exit(path) {
            switch (path.node.type) {
                case "BlockStatement":
                case "FunctionDeclaration":
                case "FunctionExpression":
                    ctx.scopes.pop();
                    break;

                case "BinaryExpression":
                case "LogicalExpression":
                    optimizeBinop(ctx, ast, path);
                    break;

                case "UnaryExpression":
                    let operand;
                    if (unOps[path.node.operator] && (operand = knownValue(ctx, path.node.argument as Ast)) && operand.kind === ValueType.Concrete) {
                        const result = unOps[path.node.operator](operand.value);
                        const resultValue = anyToNode(result);
                        if (resultValue) {
                            path.replaceWith(resultValue);
                        }
                    }
                    break;

                case "ConditionalExpression":
                case "IfStatement":
                    let test;
                    if ((test = knownValue(ctx, path.node.test as Ast)) && test.kind === ValueType.Concrete) {
                        if (test.value) {
                            path.replaceWith(path.node.consequent);
                        } else if (path.node.alternate !== null) {
                            path.replaceWith(path.node.alternate);
                        } else {
                            path.remove();
                        }
                    }
                    break;

                case "Identifier":
                    if (!(babelTypes.isAssignmentExpression(path.parent) ||
                            babelTypes.isVariableDeclarator(path.parent))) {
                        const result = ctx.resolve(path.node.name);
                        if (result) {
                            const resultNode = valueToNode(result);
                            if (resultNode) {
                                path.replaceWith(resultNode);
                            }
                        }
                    }
            }

            applyEffects(ctx, (path.node as Ast).exitEffects);
        }
    });
}
