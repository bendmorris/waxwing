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
    dest: IrBlock,
    then?: IrBlock,
}

/**
 * If statement.
 */
export interface IrIfStmt extends IrBase {
    kind: IrStmtType.If,
    condition: IrTrivialExpr,
    body: IrBlock,
    elseBody?: IrBlock,
    then?: IrBlock,
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
    then?: IrBlock,
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
            return `goto ${stmt.dest.id}${stmt.then ? ` then goto ${stmt.then.id}` : ''}`;
        }
        case IrStmtType.Return: {
            return `return ${exprToString(stmt.expr)}`;
        }
        case IrStmtType.If: return `if ${exprToString(stmt.condition)} goto ${stmt.body.id}${stmt.elseBody ? ` else goto ${stmt.elseBody.id}` : ''}${stmt.then ? ` then goto ${stmt.then.id}` : ''}`;
        case IrStmtType.Loop: {
            let loopType: string;
            switch (stmt.loopType) {
                case LoopType.While: loopType = 'while'; break;
                case LoopType.DoWhile: loopType = 'do while'; break;
                case LoopType.ForIn: loopType = 'for in'; break;
                case LoopType.ForOf: loopType = 'for of'; break;
            }
            return `${loopType} ${exprToString(stmt.expr)} goto ${stmt.body.id}${stmt.then ? ` then goto ${stmt.then.id}` : ''}`;
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
