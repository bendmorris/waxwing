import { Ast } from '../ast';
import { FunctionDefinition } from './function';
import { InstanceMember } from './instance';
import { Lvalue, lvalueToString, lvalueGlobal } from './lvalue';
import { TempVar, tempToString } from './temp';

export const enum IrExprType {
    // trivial
    Raw,
    Literal,
    Temp,
    Identifier,
    Phi,
    This,
    Arguments,
    Next,
    Function,
    // must be decomposed
    Unop,
    Binop,
    Property,
    Call,
    // must be assigned, not inlineable
    NewInstance,
}

export function isTrivial(expr: IrExpr) {
    switch (expr.kind) {
        case IrExprType.Raw:
        case IrExprType.Literal:
        case IrExprType.Temp:
        case IrExprType.Identifier:
        case IrExprType.Phi:
        case IrExprType.This:
        case IrExprType.Arguments:
        case IrExprType.Next:
        case IrExprType.Function: {
            return true;
        }
    }
    return false;
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

export interface IrTempExpr extends TempVar {
    kind: IrExprType.Temp,
}

export function exprTemp(temp: TempVar): IrTempExpr {
    return {
        kind: IrExprType.Temp,
        blockId: temp.blockId,
        varId: temp.varId,
    };
}

export function exprTemp2(blockId: number, varId: number): IrTempExpr {
    return {
        kind: IrExprType.Temp,
        blockId,
        varId,
    };
}

export interface IrIdentifierExpr {
    kind: IrExprType.Identifier,
    lvalue: Lvalue,
}

export function exprIdentifier(lvalue: Lvalue): IrIdentifierExpr {
    return {
        kind: IrExprType.Identifier,
        lvalue,
    };
}

export function exprIdentifierGlobal(name: string): IrIdentifierExpr {
    return exprIdentifier(lvalueGlobal(name));
}

export interface IrPhiExpr {
    kind: IrExprType.Phi,
    temps: TempVar[],
}

export function exprPhi(temps: TempVar[]): IrPhiExpr {
    return {
        kind: IrExprType.Phi,
        temps,
    };
}

export interface IrThisExpr {
    kind: IrExprType.This,
}

export interface IrArgumentsExpr {
    kind: IrExprType.Arguments,
}

export interface IrNewInstanceExpr {
    kind: IrExprType.NewInstance,
    instanceId: number,
    isArray: boolean,
    definition: InstanceMember[],
}

export function exprEmptyArray(instanceId: number): IrNewInstanceExpr {
    return {
        kind: IrExprType.NewInstance,
        instanceId,
        isArray: true,
        definition: [],
    }
}

export function exprEmptyObject(instanceId: number): IrNewInstanceExpr {
    return {
        kind: IrExprType.NewInstance,
        instanceId,
        isArray: false,
        definition: [],
    }
}

export interface IrNextExpr {
    kind: IrExprType.Next,
    nextIn: boolean,
    value: IrTrivialExpr,
}

export interface IrFunctionExpr {
    kind: IrExprType.Function,
    def: FunctionDefinition,
}

export function exprFunction(def: FunctionDefinition): IrFunctionExpr {
    return {
        kind: IrExprType.Function,
        def,
    };
}

export type IrTrivialExpr =
    IrRawExpr |
    IrLiteralExpr |
    IrTempExpr |
    IrIdentifierExpr |
    IrPhiExpr |
    IrThisExpr |
    IrArgumentsExpr |
    IrNextExpr |
    IrFunctionExpr
;

export type UnaryOperator = '+' | '-' | '!' | '~' | 'delete' | 'void' | 'typeof' | 'throw';

export interface IrUnopExpr {
    kind: IrExprType.Unop,
    operator: UnaryOperator,
    prefix: boolean,
    expr: IrTrivialExpr,
}

export function exprUnop(operator: UnaryOperator, prefix: boolean, expr: IrTrivialExpr): IrUnopExpr {
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
    left: IrTrivialExpr,
    right: IrTrivialExpr,
}

export function exprBinop(operator: BinaryOperator, left: IrTrivialExpr, right: IrTrivialExpr): IrBinopExpr {
    return {
        kind: IrExprType.Binop,
        operator,
        left,
        right,
    }
}

export interface IrPropertyExpr {
    kind: IrExprType.Property,
    expr: IrTrivialExpr,
    property: IrTrivialExpr,
}

export function exprProperty(expr: IrTrivialExpr, property: IrTrivialExpr): IrPropertyExpr {
    return {
        kind: IrExprType.Property,
        expr,
        property,
    }
}

export interface IrCallExpr {
    kind: IrExprType.Call,
    callee: IrTrivialExpr,
    args: IrTrivialExpr[],
    isNew: boolean,
}

export function exprCall(callee: IrTrivialExpr, args: IrTrivialExpr[], isNew: boolean = false): IrCallExpr {
    return {
        kind: IrExprType.Call,
        callee,
        args,
        isNew,
    };
}

/**
 * In WWIR, an IrExpr is a compound expression composed of multiple
 * IrTrivialExprs. To create statements, these must be decomposed by assigning
 * to temps.
 */
export type IrExpr = IrTrivialExpr | IrUnopExpr | IrBinopExpr | IrPropertyExpr |IrCallExpr | IrNewInstanceExpr;

export function exprToString(expr: IrExpr) {
    switch (expr.kind) {
        case IrExprType.Arguments: return 'arguments';
        case IrExprType.Binop: return `${exprToString(expr.left)} ${expr.operator} ${exprToString(expr.right)}`;
        case IrExprType.Call: return `${exprToString(expr.callee)}(${expr.args.map(exprToString).join(', ')})`;
        case IrExprType.NewInstance: {
            if (expr.isArray) {
                return `[${expr.definition.map((x) => exprToString(x.value)).join(', ')}]`
            } else {
                return `{${expr.definition.map((x) => `[${exprToString(x.key)}]: ${exprToString(x.value)}`).join(', ')}}`
            }
        }
        case IrExprType.Function: return `${expr.def.description()} { ... }` // FIXME
        case IrExprType.Identifier: return lvalueToString(expr.lvalue);
        case IrExprType.Literal: return typeof expr.value === 'string' ? JSON.stringify(expr.value) : String(expr.value);
        case IrExprType.Next: return `next ${expr.nextIn ? 'in' : 'of'} ${exprToString(expr.value)}`;
        case IrExprType.Phi: return `phi(${expr.temps.map(tempToString).join(', ')})`;
        case IrExprType.Property: return `${exprToString(expr.expr)}[${exprToString(expr.property)}]`;
        case IrExprType.Raw: return `<raw AST: ${expr.ast.type}>`;
        case IrExprType.Temp: return tempToString(expr);
        case IrExprType.This: return 'this';
        case IrExprType.Unop: return expr.prefix ? `${expr.operator}${exprToString(expr.expr)}` : `${exprToString(expr.expr)}${expr.operator}`;
    }
}

export function canonicalizeExpr(expr: IrExpr) {
    // TODO
}
