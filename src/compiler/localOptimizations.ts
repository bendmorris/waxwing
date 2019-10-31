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
        BinaryExpression(path) {
            optimizeBinop(ctx, ast, path);
        },
        LogicalExpression(path) {
            optimizeBinop(ctx, ast, path);
        },
    });
}
