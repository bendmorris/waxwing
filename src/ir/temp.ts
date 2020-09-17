import { IrStmt } from './stmt';
import { IrExpr } from './expr';

export interface TempVar {
    blockId: number,
    varId: number,
}

export function temp(blockId: number, varId: number): TempVar {
    if (varId === undefined) {
        throw new TypeError(`undefined variable in block ${blockId}`);
    }
    return {
        blockId,
        varId,
    };
}

export class IrTempMetadata implements TempVar {
    blockId: number;
    varId: number;
    origin?: IrStmt;
    definition?: IrExpr;
    requiresRegister: boolean;
    inlined: boolean;

    constructor(blockId: number, varId: number) {
        this.blockId = blockId;
        this.varId = varId;
        this.requiresRegister = true;
        this.inlined = false;
    }
}

export function tempToString(temp: TempVar) {
    return `$${temp.blockId}:${temp.varId}`;
}
