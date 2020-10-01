import * as ir from '../../ir';
import * as u from '../utils';

type AvailableMap = Record<string, ir.IrTempStmt>;

function visitBlock(program: ir.IrProgram, block: ir.IrBlock, available?: AvailableMap) {
    // TODO: partial availability, shared usage across branches
    if (!available) {
        available = {};
    }
    for (const stmt of block.body) {
        switch (stmt.kind) {
            case ir.IrStmtType.Temp: {
                if (stmt.expr.kind === ir.IrExprType.NewArray ||
                    stmt.expr.kind === ir.IrExprType.NewObject ||
                    stmt.effects.length)
                {
                    break;
                }
                const expr = u.simplifyExpr(block, stmt.expr);
                ir.canonicalizeExpr(expr);
                const key = ir.exprToString(expr);
                const found = available[key];
                if (found) {
                    const meta = block.getTempDefinition(stmt.varId);
                    meta.expr = stmt.expr = ir.exprTemp(found);
                } else {
                    available[key] = stmt;
                }
                break;
            }
        }
    }
    u.applyToNextBlocks((b) => visitBlock(program, b, {...available}), block);
}

export function visitFunction(program: ir.IrProgram, irFunction: ir.IrFunction) {
    visitBlock(program, irFunction.body);
}
