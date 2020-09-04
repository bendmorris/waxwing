import { TrivialExpr, exprToString } from './expr';

export interface TempVar {
    blockId: number,
    varId: number,
};

export const enum LvalueType {
    Temp,
    Register,
    Global,
}

export interface LvalueTemp extends TempVar {
    kind: LvalueType.Temp,
}

export function lvalueTemp(blockId: number, varId: number): LvalueTemp {
    if (varId === undefined) {
        throw new TypeError(`undefined variable in block ${blockId}`);
    }
    return {
        kind: LvalueType.Temp,
        blockId,
        varId,
    };
}

export interface LvalueGlobal {
    kind: LvalueType.Global,
    name: string,
}

export function lvalueGlobal(name: string): LvalueGlobal {
    return {
        kind: LvalueType.Global,
        name,
    };
}

export type Lvalue = LvalueTemp | LvalueGlobal;

export function lvalueToString(lvalue: Lvalue) {
    switch (lvalue.kind) {
        case LvalueType.Temp: return `$${lvalue.blockId}:${lvalue.varId}`;
        case LvalueType.Global: return lvalue.name;
    }
}
