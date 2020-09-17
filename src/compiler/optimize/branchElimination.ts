import * as ir from '../../ir';
import { simplifyExpr } from './utils';

// TODO: replace `simplfyExpr` use with constraint solver
export function optimizeStmt(block: ir.IrBlock, stmt: ir.IrStmt) {
    switch (stmt.kind) {
        case ir.IrStmtType.If: {
            const simpleTest = simplifyExpr(block, stmt.condition);
            if (simpleTest && simpleTest.kind === ir.IrExprType.Literal) {
                stmt.knownBranch = !!simpleTest.value;
                if (stmt.knownBranch) {
                    if (stmt.elseBody) {
                        stmt.elseBody.live = false;
                    }
                } else {
                    stmt.body.live = false;
                }
            }
            break;
        }
        case ir.IrStmtType.Loop: {
            switch (stmt.loopType) {
                case ir.LoopType.While: {
                    const simpleTest = simplifyExpr(block, stmt.expr);
                    if (simpleTest && simpleTest.kind === ir.IrExprType.Literal) {
                        stmt.knownBranch = !!simpleTest.value;
                        if (!stmt.knownBranch) {
                            stmt.live = false;
                        }
                    }
                    break;
                }
                case ir.LoopType.DoWhile: {
                    const simpleTest = simplifyExpr(block, stmt.expr);
                    if (simpleTest && simpleTest.kind === ir.IrExprType.Literal) {
                        stmt.knownBranch = !!simpleTest.value;
                    }
                    break;
                }
                case ir.LoopType.ForIn: {
                    // TODO
                    break;
                }
                case ir.LoopType.ForOf: {
                    // TODO
                    break;
                }
            }
        }
    }
}