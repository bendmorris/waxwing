import * as ir from '../../ir';
import { updateGraph } from '../../ir';
import * as log from '../../log';

function markStmtLive(program: ir.IrProgram, stmt: ir.IrStmt, escapes: boolean = false, parent?: ir.IrStmt) {
    if (parent) {
        stmt.live = updateGraph(stmt.live, parent);
        if (escapes) {
            stmt.escapes = updateGraph(stmt.escapes, parent);
        }
    } else {
        stmt.live = true;
        if (escapes) {
            stmt.escapes = true;
        }
    }
    ir.applyToExprsInStmt((x) => markExprLive(program, x, escapes, stmt), stmt);
}

function markExprLive(program: ir.IrProgram, expr: ir.IrExpr, escapes: boolean = false, parent?: ir.IrStmt) {
    switch (expr.kind) {
        case ir.IrExprType.Temp: {
            const temp = program.getTemp(expr.blockId, expr.varId);
            if (temp.kind === ir.IrStmtType.Temp) {
                markStmtLive(program, temp, escapes, parent);
            }
            break;
        }
    }
}

export function visitStatement(program: ir.IrProgram, block: ir.IrBlock, stmt: ir.IrStmt) {
    switch (stmt.kind) {
        case ir.IrStmtType.Temp: {
            const expr = stmt.expr;
            if (stmt.effects && stmt.effects.length) {
                markStmtLive(program, stmt);
                for (const effect of stmt.effects) {
                    if (effect) {
                        markStmtLive(program, effect, false);
                    }
                }
            }
            switch (expr.kind) {
                case ir.IrExprType.Function: {
                    // FIXME
                    stmt.live = true;
                    break;
                }
                case ir.IrExprType.Call: {
                    markExprLive(program, stmt.expr);
                    markStmtLive(program, stmt);
                    for (const arg of expr.args) {
                        markExprLive(program, arg, true);
                    }
                    break;
                }
                case ir.IrExprType.Set: {
                    markStmtLive(program, stmt);
                    break;
                }
                default: {
                    stmt.live = false;
                }
            }
            break;
        }
        case ir.IrStmtType.If: {
            // an if statement and its condition are live if anything in either clause is
            // TODO
            break;
        }
        case ir.IrStmtType.Loop: {
            // a loop is live if anything in its body is
            // TODO
            break;
        }
        case ir.IrStmtType.Break:
        case ir.IrStmtType.Continue:
        case ir.IrStmtType.Return:
        {
            // TODO: break/continue are only live if their loop is
            markStmtLive(program, stmt, true);
            break;
        }
        default: {
            stmt.live = false;
        }
    }
}

export function visitBlock(program: ir.IrProgram, block: ir.IrBlock) {
    let i = 0;
    while (i < block.body.length) {
        if (ir.isLive(block.body[i])) {
            ++i;
        } else {
            block.body.splice(i, 1);
        }
    }
}
