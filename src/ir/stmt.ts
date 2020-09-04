import { Lvalue, lvalueToString } from './lvalue';
import { Expr, TrivialExpr, exprToString } from './expr';
import { IrBlock } from './block';
import { FunctionDefinition } from './function';
// import { Constraint } from './constraint';

export const enum IrStmtType {
    ExprStmt,
    Assignment,
    Set,
    Return,
    If,
    Loop,
    Continue,
    Break,
    FunctionDeclaration,
}

export interface IrBase {
    kind: IrStmtType,
}


export interface IrExprStmt extends IrBase {
    kind: IrStmtType.ExprStmt,
    expr: Expr,
}

export interface IrAssignmentStmt extends IrBase {
    kind: IrStmtType.Assignment,
    lvalue: Lvalue,
    expr: Expr,
}

export interface IrSetStmt extends IrBase {
    kind: IrStmtType.Set,
    lvalue: Lvalue,
    property?: TrivialExpr,
    expr: TrivialExpr,
}

export interface IrIfStmt extends IrBase {
    kind: IrStmtType.If,
    condition: TrivialExpr,
    body: IrBlock,
    elseBody?: IrBlock,
}

export const enum LoopType {
    While,
    DoWhile,
    ForIn,
    ForOf,
}

export interface IrLoopStmt extends IrBase {
    kind: IrStmtType.Loop,
    loopType: LoopType,
    expr: TrivialExpr,
    body: IrBlock,
}

export interface IrContinueStmt extends IrBase {
    kind: IrStmtType.Continue,
}

export interface IrBreakStmt extends IrBase {
    kind: IrStmtType.Break,
}

export interface IrReturnStmt extends IrBase {
    kind: IrStmtType.Return,
    expr?: TrivialExpr,
}

export interface IrFunctionDeclarationStmt extends IrBase {
    kind: IrStmtType.FunctionDeclaration,
    def: FunctionDefinition,
}

export type IrStmt =
    IrExprStmt |
    IrAssignmentStmt |
    IrSetStmt |
    IrReturnStmt |
    IrIfStmt |
    IrLoopStmt |
    IrContinueStmt |
    IrBreakStmt |
    IrFunctionDeclarationStmt
;

export function stmtToString(stmt: IrStmt): string {
    switch (stmt.kind) {
        case IrStmtType.ExprStmt: {
            return exprToString(stmt.expr);
        }
        case IrStmtType.Assignment: {
            return `${lvalueToString(stmt.lvalue)} = ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.Set: {
            return `${lvalueToString(stmt.lvalue)}[${stmt.property ? exprToString(stmt.property) : ''}] = ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.Return: {
            return `return ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.If: return `if ${exprToString(stmt.condition)} =>${stmt.body.id}${stmt.elseBody ? (' else =>' + stmt.elseBody.id) : ''}`;
        case IrStmtType.Loop: switch (stmt.loopType) {
            case LoopType.While: return `while ${exprToString(stmt.expr)} =>${stmt.body.id}`;
            case LoopType.DoWhile: return `do while ${exprToString(stmt.expr)} =>${stmt.body.id}`;
            case LoopType.ForIn: return `for in ${exprToString(stmt.expr)} =>${stmt.body.id}`;
            case LoopType.ForOf: return `for of ${exprToString(stmt.expr)} =>${stmt.body.id}`;
        }
        case IrStmtType.Continue: return `continue`;
        case IrStmtType.Break: return `break`;
        case IrStmtType.FunctionDeclaration: {
            return `${stmt.def.description()}`;
        }
    }
}
