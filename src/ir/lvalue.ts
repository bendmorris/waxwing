import { TrivialExpr } from './expr';

export const enum LvalueType {
    Local,
    Global,
    Captured,
    Property,
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

export interface LvalueBasic {
    kind: LvalueType.Global | LvalueType.Captured,
    name: string,
}

export function lvalueGlobal(name: string): LvalueBasic {
    return {
        kind: LvalueType.Global,
        name,
    };
}

export function lvalueCaptured(name: string): LvalueBasic {
    return {
        kind: LvalueType.Captured,
        name,
    };
}

export interface LvalueProperty {
    kind: LvalueType.Property,
    expr: TrivialExpr,
    property: TrivialExpr,
}

export function lvalueProperty(expr: TrivialExpr, property: TrivialExpr): LvalueProperty {
    return {
        kind: LvalueType.Property,
        expr,
        property,
    };
}

export type Lvalue = LvalueLocal | LvalueBasic | LvalueProperty;
