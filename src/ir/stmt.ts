import { IrBlock } from './block';
import { Effect } from './effect';
import { IrExpr, IrTrivialExpr, exprToString } from './expr';
import { TempVar, tempToString } from './temp';
// import { Constraint } from './constraint';

export const enum IrStmtType {
    Temp,
    Goto,
    Return,
    If,
    Loop,
    Continue,
    Break,
    //Switch,
    //Try,
    //Throw,
    Generation,
}

export interface IrStmtMetadata {
    block: IrBlock,
    live: boolean,
    knownBranch?: boolean,
    references: Set<IrStmt>,
    backReferences: Set<IrStmt>,
    effects: (IrGenerationStmt | undefined)[],
}

export interface IrBase extends Partial<IrStmtMetadata> {
    kind: IrStmtType,
}

/**
 * An assignment of an IrExpr to a temp.
 */
export interface IrTempStmt extends IrBase, TempVar {
    kind: IrStmtType.Temp,
    expr: IrExpr,
    knownValue: any,
    requiresRegister: boolean,
    inlined: boolean,
    escapes: boolean,
    origin?: IrStmt,
    originalName?: string,
}

/**
 * Not used during WWIR compilation; a goto should only be placed at the end of
 * a block as a replacement for a previous branch which has been eliminated.
 */
export interface IrGotoStmt extends IrBase {
    kind: IrStmtType.Goto,
    blockId: number,
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
 * Used to track an effect; not part of the program.
 */
export interface IrGenerationStmt extends IrBase, TempVar {
    kind: IrStmtType.Generation,
    from: TempVar,
    source: IrStmt,
}

export type IrStmt = (
    IrTempStmt |
    IrGotoStmt |
    IrReturnStmt |
    IrIfStmt |
    IrLoopStmt |
    IrContinueStmt |
    IrBreakStmt |
    IrGenerationStmt
);

function stmtToStringBase(stmt: IrStmt): string {
    switch (stmt.kind) {
        case IrStmtType.Temp: {
            return `${tempToString(stmt)} = ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.Goto: {
            return `goto ${stmt.blockId}`;
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
        case IrStmtType.Generation: return `${tempToString(stmt.from)} => ${tempToString(stmt)}`;
    }
}

export function stmtToString(stmt: IrStmt): string {
    let base = stmtToStringBase(stmt);
    if (stmt.effects.length) {
        base += ` (${stmt.effects.map((x) => x ? `${stmtToString(x)}` : 'IO').join(', ')})`;
    }
    return base;
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
