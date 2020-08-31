import { Lvalue, lvalueToString } from './lvalue';
import { Expr, TrivialExpr, exprToString } from './expr';
import { assert } from 'console';
import { IrBlock } from './block';
import { FunctionDefinition } from './function';
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
    FunctionDeclaration,
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

export const enum LoopType {
    While,
    DoWhile,
    ForIn,
    ForOf,
}

export interface IrLoopStmt extends IrBase {
    kind: IrStmtType.Loop,
    loopType: LoopType,
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

export interface IrFunctionDeclarationStmt extends IrBase {
    kind: IrStmtType.FunctionDeclaration,
    def: FunctionDefinition,
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
    IrEndBlockStmt |
    IrFunctionDeclarationStmt
;

export class IrLabel {
    id: number;
    offset: number;

    constructor(id: number) {
        this.id = id;
        this.offset = -1;
    }
}

export function stmtToString(stmt: IrStmt, indentation = 0) {
    const i = ' '.repeat(indentation * 4);
    switch (stmt.kind) {
        case IrStmtType.Assignment: {
            return `${i}${lvalueToString(stmt.lvalue)} = ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.Return: {
            return `${i}return ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.If: return `${i}if`;
        case IrStmtType.Else: return `${i}else`;
        case IrStmtType.Loop: switch (stmt.loopType) {
            case LoopType.While: return `${i}while`;
            case LoopType.DoWhile: return `${i}do while`;
            case LoopType.ForIn: return `${i}for in`;
            case LoopType.ForOf: return `${i}for of`;
        }
        case IrStmtType.Continue: return `${i}continue`;
        case IrStmtType.Break: return `${i}break`;
        case IrStmtType.StartBlock: return `${i}start`;
        case IrStmtType.EndBlock: return `${i}end`;
        case IrStmtType.FunctionDeclaration: {
            return `${i}${stmt.def.description()}\n`
                + stmt.def.body.body.map((childStmt) => stmtToString(childStmt, indentation + 1)).join('\n')
            ;
        }
    }
}
