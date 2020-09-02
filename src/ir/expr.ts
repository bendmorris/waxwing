import { Ast } from '../ast';
import { Lvalue, LvalueLocal, lvalueLocal, lvalueToString, lvalueGlobal } from './lvalue';
import { IrBlock } from './block';
import { FunctionDefinition } from './function';
import { string } from 'yargs';

export const enum IrExprType {
    // trivial
    Raw,
    Literal,
    Identifier,
    Phi,
    This,
    Arguments,
    GlobalThis,
    Array,
    Object,
    Next,
    Function,
    // must be decomposed
    Unop,
    Binop,
    Property,
    Call,
}

export interface IrRawExpr {
    kind: IrExprType.Raw,
    ast: Ast,
}

export function exprRaw(ast: Ast): IrRawExpr {
    return {
        kind: IrExprType.Raw,
        ast,
    };
}

export interface IrLiteralExpr {
    kind: IrExprType.Literal,
    value: any,
}

export function exprLiteral(value: any): IrLiteralExpr {
    return {
        kind: IrExprType.Literal,
        value,
    };
}

export interface IrIdentifierExpr {
    kind: IrExprType.Identifier,
    lvalue: Lvalue,
}

export function exprIdentifierLocal(id: number): IrIdentifierExpr {
    return {
        kind: IrExprType.Identifier,
        lvalue: lvalueLocal(id),
    };
}

export function exprIdentifierGlobal(name: string): IrIdentifierExpr {
    return {
        kind: IrExprType.Identifier,
        lvalue: lvalueGlobal(name),
    };
}

export interface IrPhiExpr {
    kind: IrExprType.Phi,
    lvalues: LvalueLocal[],
}

export interface IrThisExpr {
    kind: IrExprType.This,
}

export interface IrArgumentsExpr {
    kind: IrExprType.Arguments,
}

export interface IrGlobalThisExpr {
    kind: IrExprType.GlobalThis,
}

export interface IrArrayExpr {
    kind: IrExprType.Array,
    values: TrivialExpr[],
}

export interface IrObjectExpr {
    kind: IrExprType.Object,
    properties: {key: TrivialExpr, value: TrivialExpr}[],
}

export interface IrNextExpr {
    kind: IrExprType.Next,
    nextIn: boolean,
    value: TrivialExpr,
}

export interface IrFunctionExpr {
    kind: IrExprType.Function,
    def: FunctionDefinition,
}

export type TrivialExpr =
    IrRawExpr |
    IrLiteralExpr |
    IrIdentifierExpr |
    IrPhiExpr |
    IrThisExpr |
    IrArgumentsExpr |
    IrGlobalThisExpr |
    IrArrayExpr |
    IrObjectExpr |
    IrNextExpr |
    IrFunctionExpr
;

export type UnaryOperator = '+' | '-' | '!' | '~' | 'delete' | 'void' | 'typeof' | 'throw';

export interface IrUnopExpr {
    kind: IrExprType.Unop,
    operator: UnaryOperator,
    prefix: boolean,
    expr: TrivialExpr,
}

export function exprUnop(operator: UnaryOperator, prefix: boolean, expr: TrivialExpr): IrUnopExpr {
    return {
        kind: IrExprType.Unop,
        operator,
        prefix,
        expr,
    }
}

export type BinaryOperator =
    '*' | '/' | '%' | '**' |
    '+' | '-' |
    '<<' | '>>' | '>>>' |
    '<' | '>' | '<=' | '>=' |
    'instanceof' | 'in' |
    '==' | '!=' | '===' | '!==' |
    '&' | '^' | '|' |
    '&&' | '||' | ',' |
    '??'
;

export interface IrBinopExpr {
    kind: IrExprType.Binop,
    operator: BinaryOperator,
    left: TrivialExpr,
    right: TrivialExpr,
}

export function exprBinop(operator: BinaryOperator, left: TrivialExpr, right: TrivialExpr): IrBinopExpr {
    return {
        kind: IrExprType.Binop,
        operator,
        left,
        right,
    }
}

export interface IrPropertyExpr {
    kind: IrExprType.Property,
    expr: TrivialExpr,
    property: TrivialExpr,
}

export function exprProperty(expr: TrivialExpr, property: TrivialExpr): IrPropertyExpr {
    return {
        kind: IrExprType.Property,
        expr,
        property,
    }
}

export interface IrCallExpr {
    kind: IrExprType.Call,
    callee: TrivialExpr,
    args: TrivialExpr[],
    isNew: boolean,
}

export function exprCall(callee: TrivialExpr, args: TrivialExpr[], isNew: boolean = false): IrCallExpr {
    return {
        kind: IrExprType.Call,
        callee,
        args,
        isNew,
    };
}

/**
 * In WWIR, an Expr is a compound expression composed of multiple TrivialExprs.
 * To create statements, these must be decomposed by assigning to locals.
 */
export type Expr = TrivialExpr | IrUnopExpr | IrBinopExpr | IrPropertyExpr |IrCallExpr;

export function exprToString(expr: Expr) {
    switch (expr.kind) {
        case IrExprType.Arguments: return 'arguments';
        case IrExprType.Array: return `[${expr.values.map(exprToString).join(', ')}]`;
        case IrExprType.Binop: return `${exprToString(expr.left)} ${expr.operator} ${exprToString(expr.right)}`;
        case IrExprType.Call: return `${exprToString(expr.callee)}(${expr.args.map(exprToString).join(', ')})`;
        case IrExprType.Function: return `${expr.def.description()} { ... }` // FIXME
        case IrExprType.GlobalThis: return 'globalThis';
        case IrExprType.Identifier: return lvalueToString(expr.lvalue);
        case IrExprType.Literal: return typeof expr.value === 'string' ? JSON.stringify(expr.value) : String(expr.value);
        case IrExprType.Next: return `next ${expr.nextIn ? 'in' : 'of'} ${exprToString(expr.value)}`;
        case IrExprType.Object: return '???'; // FIXME
        case IrExprType.Phi: return `phi(${expr.lvalues.map(lvalueToString).join(', ')})`;
        case IrExprType.Property: return `${exprToString(expr.expr)}[${exprToString(expr.property)}]`;
        case IrExprType.Raw: return `<raw AST: ${expr.ast.type}>`;
        case IrExprType.This: return 'this';
        case IrExprType.Unop: return expr.prefix ? `${expr.operator}${exprToString(expr.expr)}` : `${exprToString(expr.expr)}${expr.operator}`;
    }
}
