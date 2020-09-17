import * as ir from '../ir';

export function markStmtLive(stmt: ir.IrStmt) {
    stmt.live = true;
    ir.applyToExprsInStmt((x) => markExprLive(stmt.block, x), stmt);
    if (stmt.block.container) {
        markStmtLive(stmt.block.container);
    }
}

export function markExprLive(block: ir.IrBlock, expr: ir.IrExpr) {
    const program = block.program;
    switch (expr.kind) {
        case ir.IrExprType.Temp: {
            const block = program.getBlock(expr.blockId);
            const temp = block.getTempMetadata(expr.varId);
            if (temp && !temp.origin.live) {
                markStmtLive(temp.origin);
            }
            break;
        }
        case ir.IrExprType.NewInstance: {
            const instance = block.instances[expr.instanceId];
            if (instance) {
                for (const gen of instance.generations) {
                    if (!gen.stmt.live) {
                        markStmtLive(gen.stmt);
                    }
                }
            }
            break;
        }
    }
}
