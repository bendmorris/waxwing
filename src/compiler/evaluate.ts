import * as babelTypes from '@babel/types';
import babelTraverse from '@babel/traverse';
import { Ast } from '../ast';
import { Effect, EffectType } from '../effect';
import { Scope } from '../scope';
import { ValueType, abstractValue, unknownValue } from '../value';
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
        }
    }
    return undefined;
}