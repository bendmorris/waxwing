import { IrTrivialExpr, exprToString } from './expr';

export const enum LvalueType {
    Global,
    Scoped,
    Property,
}

export interface LvalueScoped {
    kind: LvalueType.Scoped,
    scopeId: number,
    name: string,
}

export function lvalueScoped(scopeId: number, name: string): LvalueScoped {
    return {
        kind: LvalueType.Scoped,
        scopeId,
        name,
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

export interface LvalueProperty {
    kind: LvalueType.Property,
    object: IrTrivialExpr,
    property: IrTrivialExpr,
}

export function lvalueProperty(object: IrTrivialExpr, property: IrTrivialExpr): LvalueProperty {
    return {
        kind: LvalueType.Property,
        object,
        property,
    };
}

export type Lvalue = LvalueGlobal | LvalueScoped | LvalueProperty;

export function lvalueToString(lvalue: Lvalue) {
    switch (lvalue.kind) {
        // case LvalueType.Register: return `#${lvalue.registerId}`;
        case LvalueType.Global: return lvalue.name;
        case LvalueType.Scoped: return `${lvalue.name}#${lvalue.scopeId}`
        case LvalueType.Property: return `${exprToString(lvalue.object)}[${exprToString(lvalue.property)}]`;
    }
}
