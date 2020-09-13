import { Lvalue, lvalueToString } from './lvalue';
import { IrBlock } from './block';
import { Effect } from './effect';
import { IrExpr, IrTrivialExpr, exprToString } from './expr';
import { FunctionDefinition } from './function';
import { TempVar, tempToString } from './temp';
// import { Constraint } from './constraint';

export const enum IrStmtType {
    ExprStmt,
    Temp,
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

/**
 * A statement containing an expression whose value is unused.
 */
export interface IrExprStmt extends IrBase {
    kind: IrStmtType.ExprStmt,
    expr: IrExpr,
}

/**
 * An assignment of an IrExpr to a temp.
 */
export interface IrTempStmt extends IrBase, TempVar {
    kind: IrStmtType.Temp,
    expr: IrExpr,
}

/**
 * An assignment to an lvalue.
 */
export interface IrAssignmentStmt extends IrBase {
    kind: IrStmtType.Assignment,
    lvalue: Lvalue,
    expr: IrExpr,
}

/**
 * Property set on an object.
 */
export interface IrSetStmt extends IrBase {
    kind: IrStmtType.Set,
    object: IrTrivialExpr,
    property?: IrTrivialExpr,
    expr: IrTrivialExpr,
}

/**
 * If statement.
 */
export interface IrIfStmt extends IrBase {
    kind: IrStmtType.If,
    condition: IrTrivialExpr,
    body: IrBlock,
    elseBody?: IrBlock,
}

export const enum LoopType {
    While,
    DoWhile,
    ForIn,
    ForOf,
}

/**
 * A while, do/while, for/in or for/of loop.
 */
export interface IrLoopStmt extends IrBase {
    kind: IrStmtType.Loop,
    loopType: LoopType,
    expr: IrTrivialExpr,
    body: IrBlock,
}

/**
 * `continue` in a loop.
 */
export interface IrContinueStmt extends IrBase {
    kind: IrStmtType.Continue,
}

/**
 * `break` in a loop.
 */
export interface IrBreakStmt extends IrBase {
    kind: IrStmtType.Break,
}

/**
 * Function return.
 */
export interface IrReturnStmt extends IrBase {
    kind: IrStmtType.Return,
    expr?: IrTrivialExpr,
}

/**
 * Function declaration.
 */
export interface IrFunctionDeclarationStmt extends IrBase {
    kind: IrStmtType.FunctionDeclaration,
    def: FunctionDefinition,
}

export type IrStmt =
    IrExprStmt |
    IrTempStmt |
    IrAssignmentStmt |
    IrSetStmt |
    IrReturnStmt |
    IrIfStmt |
    IrLoopStmt |
    IrContinueStmt |
    IrBreakStmt |
    IrFunctionDeclarationStmt
;

export interface IrStmtMetadata {
    block: IrBlock,
    live: boolean,
    knownBranch?: boolean,
    effects: Effect[],
}

export type StmtWithMeta = IrStmt & Partial<IrStmtMetadata>;

export function stmtToString(stmt: IrStmt): string {
    switch (stmt.kind) {
        case IrStmtType.ExprStmt: {
            return exprToString(stmt.expr);
        }
        case IrStmtType.Temp: {
            return `${tempToString(stmt)} = ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.Assignment: {
            return `${lvalueToString(stmt.lvalue)} = ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.Set: {
            return `${exprToString(stmt.object)}[${stmt.property ? exprToString(stmt.property) : ''}] = ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.Return: {
            return `return ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.If: return `if ${exprToString(stmt.condition)} goto ${stmt.body.id}${stmt.elseBody ? (' else goto ' + stmt.elseBody.id) : ''}`;
        case IrStmtType.Loop: switch (stmt.loopType) {
            case LoopType.While: return `while ${exprToString(stmt.expr)} goto ${stmt.body.id}`;
            case LoopType.DoWhile: return `do while ${exprToString(stmt.expr)} goto ${stmt.body.id}`;
            case LoopType.ForIn: return `for in ${exprToString(stmt.expr)} goto ${stmt.body.id}`;
            case LoopType.ForOf: return `for of ${exprToString(stmt.expr)} goto ${stmt.body.id}`;
        }
        case IrStmtType.Continue: return `continue`;
        case IrStmtType.Break: return `break`;
        case IrStmtType.FunctionDeclaration: {
            return `${stmt.def.description()}`;
        }
    }
}

export function isBlockBoundary(stmt: IrStmt) {
    switch (stmt.kind) {
        case IrStmtType.If:
        case IrStmtType.Loop: {
            return true;
        }
    }
    return false;
}
