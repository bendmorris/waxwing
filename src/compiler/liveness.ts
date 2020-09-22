import * as ir from '../ir';

export function isLive(stmt: ir.IrStmt): boolean {
    return stmt.live;
}

type Marker = (_: ir.IrStmt) => void;
function markLive(stmt: ir.IrStmt) { stmt.live = true; }
export function markStmtLive(stmt: ir.IrStmt) { markStmt(markLive, stmt); }
export function markExprLive(block: ir.IrBlock, expr: ir.IrExpr) { markExpr(markLive, block, expr); }

export function markStmt(marker: Marker, stmt: ir.IrStmt) {
    marker(stmt);
    for (const ref of stmt.references) {
        if (!ref.live) {
            markStmt(marker, ref);
        }
    }
}

export function markExpr(marker: Marker, block: ir.IrBlock, expr: ir.IrExpr) {
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
            temp.escapes = true;
            markStmtLive(temp);
            break;
        }
    }
}
