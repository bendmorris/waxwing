import * as babel from '@babel/core';
import babelTraverse from '@babel/traverse';
import { Ast } from '../ast';
import { ValueType } from '../value';
import { ExecutionContext } from './context';
import { knownValue, anyToNode } from './utils';

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
    "-": (a) => -a,
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

export default function optimizeLocal(ctx: ExecutionContext, ast: Ast) {
    babelTraverse(ast, {
        BinaryExpression: {
            exit(path) {
                optimizeBinop(ctx, ast, path);
            }
        },
        LogicalExpression: {
            exit(path) {
                optimizeBinop(ctx, ast, path);
            }
        },
        UnaryExpression: {
            exit(path) {
                let operand;
                if (unOps[path.node.operator] && (operand = knownValue(ctx, path.node.argument as Ast)) && operand.kind === ValueType.Concrete) {
                    const result = unOps[path.node.operator](operand.value);
                    const resultValue = anyToNode(result);
                    if (resultValue) {
                        path.replaceWith(resultValue);
                    }
                }
            }
        },
        ConditionalExpression: {
            exit(path) {
                let test;
                if ((test = knownValue(ctx, path.node.test as Ast)) && test.kind === ValueType.Concrete) {
                    if (test.value) {
                        path.replaceWith(path.node.consequent);
                    } else {
                        path.replaceWith(path.node.alternate);
                    }
                }
            }
        }
    });
}
