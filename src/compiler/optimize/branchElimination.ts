import * as ir from '../../ir';
import { simplifyExpr } from './simplify';

// TODO: replace `simplfyExpr` use with constraint solver
export function optimizeStmt(block: ir.IrBlock, stmt: ir.StmtWithMeta) {
    switch (stmt.kind) {
        case ir.IrStmtType.If: {
            const simpleTest = simplifyExpr(block, stmt.condition);
            if (simpleTest && simpleTest.kind === ir.IrExprType.Literal) {
                stmt.knownBranch = !!simpleTest.value;
                if (stmt.knownBranch) {
                    if (stmt.elseBody) {
                        stmt.elseBody.dead = true;
                    }
                } else {
                    stmt.body.dead = true;
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
                            stmt.dead = true;
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
        default: {}
    }
}