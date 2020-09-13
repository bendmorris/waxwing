import * as ir from '../../ir';
import { canonicalizeExpr } from '../../ir';
import * as u from './utils';

type AvailableMap = Record<string, ir.IrTempStmt>;

function optimizeBlock(block: ir.IrBlock, available?: AvailableMap) {
    // TODO: partial availability, shared usage across branches
    if (!available) {
        available = {};
    }
    for (const stmt of block.body) {
        switch (stmt.kind) {
            case ir.IrStmtType.Temp: {
                if (stmt.expr.kind === ir.IrExprType.NewInstance) {
                    break;
                }
                ir.canonicalizeExpr(stmt.expr);
                const key = ir.exprToString(stmt.expr);
                const found = available[key];
                if (found) {
                    const meta = block.getTempMetadata(stmt.varId);
                    meta.definition = stmt.expr = ir.exprTemp(found);
                } else {
                    available[key] = stmt;
                }
                break;
            }
        }
    }
    u.applyToNextBlocks((b) => optimizeBlock(b, {...available}), block);
}

// TODO: replace `simplfyExpr` use with constraint solver
export function optimizeFunction(firstBlock: ir.IrBlock) {
    optimizeBlock(firstBlock);
}
