import * as babel from '@babel/core';
import { Ast } from '../ast';
import { ExecutionContext } from './context';
import babelTraverse from '@babel/traverse';
import { knownValue } from './utils';

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

export default function optimizeLocal(ctx: ExecutionContext, ast: Ast) {
    babelTraverse(ast, {
        BinaryExpression(path) {
            let left, right;
            if (binOps[path.node.operator] && (left = knownValue(ctx, path.node.left as Ast)) && (right = knownValue(ctx, path.node.right as Ast))) {
                const result = binOps[path.node.operator](left, right);
                // TODO: replace node here
            }
        }
    });
}
