import * as ir from '../../ir';
import { simplifyExpr, simplifyTrivialExpr } from '../utils';

export function optimizeStmt(block: ir.IrBlock, stmt: ir.IrStmt) {
    switch (stmt.kind) {
        case ir.IrStmtType.Loop:
        case ir.IrStmtType.Return: {
            // TODO: create a replace utility
            stmt.expr = simplifyTrivialExpr(block, stmt.expr);
            break;
        }
        case ir.IrStmtType.If: {
            stmt.condition = simplifyTrivialExpr(block, stmt.condition);
            break;
        }
        case ir.IrStmtType.Temp: {
            const meta = block.getTempDefinition(stmt.varId);
            meta.expr = stmt.expr = simplifyExpr(block, stmt.expr);
            break;
        }
    }
}
