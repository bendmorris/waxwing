import * as ir from '../../ir';
import * as u from '../utils';

type AvailableMap = Record<string, ir.IrTempStmt>;

function optimizeBlock(block: ir.IrBlock, available?: AvailableMap) {
    // TODO: partial availability, shared usage across branches
    if (!available) {
        available = {};
    }
    for (const stmt of block.body) {
        switch (stmt.kind) {
            case ir.IrStmtType.Temp: {
                if (stmt.expr.kind === ir.IrExprType.NewArray ||
                    stmt.expr.kind === ir.IrExprType.NewObject)
                {
                    break;
                }
                const expr = u.simplifyExpr(block, stmt.expr);
                ir.canonicalizeExpr(expr);
                const key = ir.exprToString(expr);
                const found = available[key];
                if (found) {
                    const meta = block.getTempMetadata(stmt.varId);
                    meta.expr = stmt.expr = ir.exprTemp(found);
                } else {
                    available[key] = stmt;
                }
                break;
            }
        }
    }
    u.applyToNextBlocks((b) => optimizeBlock(b, {...available}), block);
}

export function optimizeFunction(firstBlock: ir.IrBlock) {
    optimizeBlock(firstBlock);
}
