import { StmtWithMeta } from './stmt';
import { IrExpr } from './expr';

export interface TempVar {
    blockId: number,
    varId: number,
};

export function temp(blockId: number, varId: number): TempVar {
    if (varId === undefined) {
        throw new TypeError(`undefined variable in block ${blockId}`);
    }
    return {
        blockId,
        varId,
    };
}

export interface IrTempMetadata {
    varId: number,
    origin: StmtWithMeta,
    references: StmtWithMeta[],
    definition?: IrExpr,
    inlined: boolean,
    register?: number,
}

export function tempToString(temp: TempVar) {
    return `$${temp.blockId}:${temp.varId}`;
}
