import { TrivialExpr, exprToString } from './expr';

export interface LocalVar {
    blockId: number,
    varId: number,
};

export const enum LvalueType {
    Local,
    Global,
}

export interface LvalueLocal extends LocalVar {
    kind: LvalueType.Local,
}

export function lvalueLocal(blockId: number, varId: number): LvalueLocal {
    return {
        kind: LvalueType.Local,
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

export type Lvalue = LvalueLocal | LvalueGlobal;

export function lvalueToString(lvalue: Lvalue) {
    switch (lvalue.kind) {
        case LvalueType.Local: return `$${lvalue.blockId}:${lvalue.varId}`;
        case LvalueType.Global: return lvalue.name;
    }
}
