import * as ir from '../../ir';

function optimizeBlock(block: ir.IrBlock) {
    const objects = {};
    const arrays = {};
    for (let i = 0; i < block.body.length; ++i) {
        const stmt = block.body[i];
        switch (stmt.kind) {
            case ir.IrStmtType.Temp: {
                switch (stmt.expr.kind) {
                    case ir.IrExprType.NewArray: {
                        arrays[stmt.varId] = stmt;
                        break;
                    }
                    case ir.IrExprType.NewObject: {
                        objects[stmt.varId] = stmt;
                        break;
                    }
                    case ir.IrExprType.Set: {
                        // TODO
                        break;
                    }
                }
            }
        }
    }
    // u.applyToNextBlocks((b) => optimizeBlock(b, instances.copy()), block);
}

// TODO: replace `simplfyExpr` use with constraint solver
export function optimizeFunction(firstBlock: ir.IrBlock) {
    optimizeBlock(firstBlock);
}
