import * as ir from '../../ir';
import * as u from '../utils';

function optimizeBlock(block: ir.IrBlock) {
    const instances = {};
    const blockStack = [block];
    while (blockStack.length) {
        const block = blockStack.shift();
        blockStack.push.apply(blockStack, u.getNextBlocks(block));

        for (let i = 0; i < block.body.length; ++i) {
            const stmt = block.body[i];
            switch (stmt.kind) {
                case ir.IrStmtType.Temp: {
                    switch (stmt.expr.kind) {
                        case ir.IrExprType.NewArray:
                        case ir.IrExprType.NewObject: {
                            instances[ir.tempToString(stmt)] = stmt;
                            break;
                        }
                        case ir.IrExprType.Set: {
                            // TODO: verify this statement has no references
                            if (stmt.expr.expr.kind === ir.IrExprType.Temp) {
                                const instanceKey = ir.tempToString(stmt.expr.expr);
                                const instance = instances[instanceKey];
                                if (instance) {
                                    if (instance.expr.kind === ir.IrExprType.NewObject) {
                                        // object set
                                        instance.expr.members.push({ key: stmt.expr.property, value: stmt.expr.value });
                                    } else {
                                        // array push
                                        instance.expr.values.push(stmt.expr.value);
                                    }
                                    stmt.live = false;
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
    }
}

// TODO: replace `simplfyExpr` use with constraint solver
export function optimizeFunction(firstBlock: ir.IrBlock) {
    optimizeBlock(firstBlock);
}
