import * as ir from '../../ir';
import { simplifyExpr } from './utils';

export function optimizeStmt(block: ir.IrBlock, stmt: ir.StmtWithMeta) {
    switch (stmt.kind) {
        case ir.IrStmtType.Assignment:
        case ir.IrStmtType.ExprStmt:
        case ir.IrStmtType.Loop:
        case ir.IrStmtType.Return: {
            const simplified = simplifyExpr(block, stmt.expr);
            if (simplified) {
                // TODO: create a replace utility
                stmt.expr = simplified;
            }
            break;
        }
        case ir.IrStmtType.If: {
            const simplified = simplifyExpr(block, stmt.condition);
            if (simplified) {
                stmt.condition = simplified;
            }
            break;
        }
        case ir.IrStmtType.Temp: {
            const simplified = simplifyExpr(block, stmt.expr);
            if (simplified) {
                const meta = block.getTempMetadata(stmt.varId);
                meta.definition = stmt.expr = simplified;
            }
            break;
        }
    }
}
