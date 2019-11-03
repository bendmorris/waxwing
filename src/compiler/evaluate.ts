import * as t from '@babel/types';
import babelTraverse from '@babel/traverse';
import { Ast } from '../ast';
import { Effect, EffectType } from '../effect';
import { Value, ValueType, FunctionValue, abstractValue, concreteValue, functionValue } from '../value';
import { ExecutionContext } from './context';
import { anyToNode, valueToNode } from './utils';

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

/**
 * Used to try to partially evaluate an AST node.
 * Can return:
 *   - A new AST node if the node can be replaced.
 *   - `null` if the node can be discarded.
 *   - `undefined` if no evaluation was possible.
 */
export function evaluate(ctx: ExecutionContext, ast: Ast) : Ast | null | undefined {
    switch (ast.type) {
        case "BinaryExpression":
        case "LogicalExpression": {
            let left, right;
            if (binOps[ast.operator] && (left = knownValue(ctx, ast.left as Ast)) && (right = knownValue(ctx, ast.right as Ast)) && left.kind === ValueType.Concrete && right.kind === ValueType.Concrete) {
                const result = binOps[ast.operator](left.value, right.value);
                const resultValue = anyToNode(result);
                if (resultValue) {
                    return resultValue;
                }
            }
            break;
        }
        case "UnaryExpression": {
            let operand;
            if (unOps[ast.operator] && (operand = knownValue(ctx, ast.argument as Ast)) && operand.kind === ValueType.Concrete) {
                const result = unOps[ast.operator](operand.value);
                const resultValue = anyToNode(result);
                if (resultValue) {
                    return resultValue;
                }
            }
            break;
        }
        case "ConditionalExpression":
        case "IfStatement": {
            let test;
            if ((test = knownValue(ctx, ast.test as Ast)) && test.kind === ValueType.Concrete) {
                if (test.value) {
                    return ast.consequent;
                } else if (ast.alternate !== null) {
                    return ast.alternate;
                } else {
                    return null;
                }
            }
            break;
        }
        case "Identifier": {
            const result = ctx.resolve(ast.name);
            if (result) {
                const resultNode = valueToNode(result.value);
                if (resultNode) {
                    return resultNode;
                } else {
                    result.addRef();
                }
            }
            break;
        }
        case "CallExpression": {
            const callee = knownValue(ctx, ast.callee);
            if (callee && callee.kind === ValueType.Function) {
                ctx.debugLog(ast, "found a call expression of a known function");
                const returnValue = tryInline(ctx, callee);
                if (returnValue) {
                    ctx.debugLog(ast, "call is inlinable");
                    return valueToNode(returnValue);
                }
            }
            break;
        }
    }
    return undefined;
}

export function evalValue(ctx: ExecutionContext, value: Value): Value {
    switch (value.kind) {
        case ValueType.Concrete:
            return value;
        case ValueType.Abstract: {
            const evaluated = evaluate(ctx, value.ast);
            const known = knownValue(ctx, evaluated || value.ast);
            if (known) {
                return known;
            } else if (evaluated) {
                return evalValue(ctx, abstractValue(evaluated));
            }
        }
    }
    return value;
}

export function knownValue(ctx: ExecutionContext, ast: Ast): Value | undefined {
    switch (ast.type) {
        case "StringLiteral":
        case "NumericLiteral":
        case "BooleanLiteral":
            return concreteValue(ast.value);
        case "NullLiteral":
            return concreteValue(null);
        case "RegExpLiteral":
            // TODO
            return concreteValue(new RegExp(ast.pattern));
        case "FunctionExpression":
            return functionValue(ast, false);
        case "ArrowFunctionExpression":
            return functionValue(ast, true);

        case "Identifier":
            if (ctx) {
                const resolved = ctx.resolve(ast.name);
                if (resolved) {
                    return resolved.value;
                }
            }
            return undefined;
    }
    return undefined;
}

export function tryInline(ctx: ExecutionContext, value: FunctionValue): Value | undefined {
    return undefined;
}
