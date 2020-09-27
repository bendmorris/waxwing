import * as ir from '../../ir';
import { simplifyExpr } from '../utils';
import { BlockBuilder } from '../compile/builder';

// TODO: replace `simplfyExpr` use with constraint solver
export function optimizeBlock(block: ir.IrBlock) {
    // any branch must be the final statement in a block
    const stmt = block.body[block.body.length - 1];
    if (!stmt) {
        return;
    }
    switch (stmt.kind) {
        case ir.IrStmtType.If: {
            const simpleTest = simplifyExpr(block, stmt.condition);
            if (simpleTest && simpleTest.kind === ir.IrExprType.Literal) {
                block.body.pop().live = false;
                const knownBranch = !!simpleTest.value;
                if (knownBranch) {
                    if (stmt.elseBody) {
                        stmt.elseBody.live = false;
                    }
                    // FIXME
                    BlockBuilder.forBlock(block).goto(stmt.body.id);
                } else {
                    stmt.body.live = false;
                    if (stmt.elseBody) {
                        BlockBuilder.forBlock(block).goto(stmt.elseBody.id);
                    }
                }
            }
            break;
        }
        case ir.IrStmtType.Loop: {
            switch (stmt.loopType) {
                case ir.LoopType.While: {
                    const simpleTest = simplifyExpr(block, stmt.expr);
                    if (simpleTest && simpleTest.kind === ir.IrExprType.Literal) {
                        const knownBranch = !!simpleTest.value;
                        if (!knownBranch) {
                            block.body.pop().live = false;
                        }
                    }
                    break;
                }
                case ir.LoopType.DoWhile: {
                    const simpleTest = simplifyExpr(block, stmt.expr);
                    if (simpleTest && simpleTest.kind === ir.IrExprType.Literal) {
                        const knownBranch = !!simpleTest.value;
                        if (!knownBranch) {
                            block.body.pop().live = false;
                            BlockBuilder.forBlock(block).goto(stmt.body.id);
                            // FIXME: need to remove any break/continue in this branch
                        }
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