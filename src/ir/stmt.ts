import { Lvalue } from './lvalue';
import { Expr, TrivialExpr } from './expr';
// import { Constraint } from './constraint';

export const enum IrStmtType {
    Assignment,
    Return,
    If,
    Else,
    Loop,
    Continue,
    Break,
    StartBlock,
    EndBlock,
}

interface IrBase {
    kind: IrStmtType,
}

export interface IrAssignmentStmt extends IrBase {
    kind: IrStmtType.Assignment,
    lvalue: Lvalue,
    expr: Expr,
}

export interface IrIfStmt extends IrBase {
    kind: IrStmtType.If,
}

export interface IrElseStmt extends IrBase {
    kind: IrStmtType.Else,
}

export interface IrLoopStmt extends IrBase {
    kind: IrStmtType.Loop,
    isDoWhile: boolean,
}

export interface IrContinueStmt extends IrBase {
    kind: IrStmtType.Continue,
}

export interface IrBreakStmt extends IrBase {
    kind: IrStmtType.Break,
}

export interface IrStartBlockStmt extends IrBase {
    kind: IrStmtType.StartBlock,
}

export interface IrEndBlockStmt extends IrBase {
    kind: IrStmtType.EndBlock,
}

export interface IrReturnStmt extends IrBase {
    kind: IrStmtType.Return,
    expr?: TrivialExpr,
}

export type IrStmt =
    IrAssignmentStmt |
    IrReturnStmt |
    IrIfStmt |
    IrElseStmt |
    IrLoopStmt |
    IrContinueStmt |
    IrBreakStmt |
    IrStartBlockStmt |
    IrEndBlockStmt
;

export class IrLabel {
    id: number;
    offset: number;

    constructor(id: number) {
        this.id = id;
        this.offset = -1;
    }
}
