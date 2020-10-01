import * as ir from '../../ir';
import { simplifyExpr } from '../utils';
import { BlockBuilder } from '../compile/builder';

// TODO: replace `simplfyExpr` use with constraint solver
export function visitBlock(program: ir.IrProgram, block: ir.IrBlock) {
    // any branch must be the final statement in a block
    const stmt = block.lastStmt;
    if (!stmt) {
        return;
    }
    switch (stmt.kind) {
        case ir.IrStmtType.If: {
            const simpleTest = simplifyExpr(block, stmt.condition);
            if (simpleTest && simpleTest.kind === ir.IrExprType.Literal) {
                stmt.live = false;
                block.body.pop().live = false;
                const knownBranch = !!simpleTest.value;
                if (knownBranch) {
                    if (stmt.elseBody) {
                        stmt.elseBody.live = false;
                    }
                    BlockBuilder.forBlock(block).goto(stmt.body, stmt.then);
                } else {
                    stmt.body.live = false;
                    if (stmt.elseBody) {
                        BlockBuilder.forBlock(block).goto(stmt.elseBody, stmt.then);
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
                            BlockBuilder.forBlock(block).goto(stmt.body, stmt.then);
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