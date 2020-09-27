import * as ir from '../ir';
import * as log from '../log';


interface Marker {
    get: (_: ir.IrStmt) => boolean,
    set: (_: ir.IrStmt) => void;
}

export function isLive(stmt: ir.IrStmt): boolean { return stmt.live; }
function markLive(stmt: ir.IrStmt) { stmt.live = true; }
const liveness = {
    get: isLive,
    set: markLive,
};
export function markStmtLive(stmt: ir.IrStmt) { markStmt(liveness, stmt); }
export function markExprLive(block: ir.IrBlock, expr: ir.IrExpr) { markExpr(liveness, block, expr); }

export function markStmt(marker: Marker, stmt: ir.IrStmt) {
    log.logChatty("marking statement", () => ir.stmtToString(stmt));
    if (marker.get(stmt)) {
        return;
    }
    marker.set(stmt);
    switch (stmt.kind) {
        case ir.IrStmtType.Temp: {
            for (const effect of stmt.effects) {
                if (effect) {
                    markStmt(marker, effect.source);
                }
            }
            break;
        }
        case ir.IrStmtType.Generation: {
            markStmt(marker, stmt.source);
            markStmt(marker, stmt.block.program.getTemp(stmt.from.blockId, stmt.from.varId));
        }
    }
    ir.applyToExprsInStmt((x) => markExpr(marker, stmt.block, x), stmt);
}

export function markExpr(marker: Marker, block: ir.IrBlock, expr: ir.IrExpr) {
    log.logChatty("marking expression", () => ir.exprToString(expr));
    const program = block.program;
    switch (expr.kind) {
        case ir.IrExprType.Temp: {
            const temp = program.getTemp(expr.blockId, expr.varId);
            markStmt(marker, temp);
            break;
        }
    }
}

export function markExprEscapes(block: ir.IrBlock, expr: ir.IrExpr) {
    const program = block.program;
    switch (expr.kind) {
        case ir.IrExprType.Temp: {
            const temp = program.getTemp(expr.blockId, expr.varId);
            if (temp.kind === ir.IrStmtType.Temp) {
                temp.escapes = true;
                markStmtLive(temp);
            }
            break;
        }
    }
}
