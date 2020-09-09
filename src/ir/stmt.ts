import { Lvalue, lvalueToString } from './lvalue';
import { IrExpr, IrTrivialExpr, exprToString } from './expr';
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


/**
 * A statement containing an expression whose value is unused.
 */
export interface IrExprStmt extends IrBase {
    kind: IrStmtType.ExprStmt,
    expr: IrExpr,
}

/**
 * An assignment of an IrExpr to either a temp, register or global variable.
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
    lvalue: Lvalue,
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
