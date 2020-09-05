import * as ir from '../../ir';

function addEffect(stmt: ir.StmtWithMeta, effect: ir.Effect) {
    stmt.effects.push(effect);
}

export function optimizeStmt(block: ir.IrBlock, stmt: ir.StmtWithMeta) {
    const program = block.program;
    for (const stmt of block.body) {
        switch (stmt.kind) {
            case ir.IrStmtType.Assignment: {
                switch (stmt.lvalue.kind) {
                    case ir.LvalueType.Temp: {
                        const meta = block.getTempMetadata(stmt.lvalue.varId);
                        if (!meta || !meta.references.length) {
                            (stmt as ir.IrBase).kind = ir.IrStmtType.ExprStmt;
                        }
                        break;
                    }
                    case ir.LvalueType.Global: {
                        addEffect(stmt, ir.effectMutation(stmt.lvalue));
                        break;
                    }
                }
                // fall through and handle the RHS's Expr
            }
            case ir.IrStmtType.ExprStmt: {
                switch (stmt.expr.kind) {
                    case ir.IrExprType.Call: {
                        // assume that any call has unavoidable side effects
                        // until we can prove otherwise
                        addEffect(stmt, ir.effectIo());
                        break;
                    }
                }
                break;
            }
            case ir.IrStmtType.Set: {
                addEffect(stmt, ir.effectMutation(stmt.lvalue));
                break;
            }
        }
    }
}
