import { Ast } from '../ast';
import { IrBlock } from '../ir/block';
import * as babel from '@babel/core';
import * as t from '@babel/types';
import { TrivialExpr } from '../ir/expr';

function decomposeExpr(expr: TrivialExpr): Ast {
    return undefined;
}

function decompose(block: IrBlock): t.Statement[] {
    // skip unused, pure temp values
    // turn unused, non-pure temp values into statements
    // inline temporary values that are only used once, as long as they don't alter effect order
    // allocate registers for all other temporary values, and replace references to them
    return [];
}

/**
 * Convert a block of WWIR into a string of JS source.
 */
export function irSerialize(block: IrBlock): string {
    const program = t.program(decompose(block));
    const { code } = babel.transformFromAstSync(program, undefined, { compact: true });
    return code + '\n';
}
