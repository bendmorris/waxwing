import { TrivialExpr, exprToString } from './expr';

export const enum LvalueType {
    Local,
    Global,
}

export interface LvalueLocal {
    kind: LvalueType.Local,
    id: number,
}

export function lvalueLocal(id: number): LvalueLocal {
    return {
        kind: LvalueType.Local,
        id,
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
        case LvalueType.Local: return `$${lvalue.id}`;
        case LvalueType.Global: return lvalue.name;
    }
}
