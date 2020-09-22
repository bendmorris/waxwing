import * as ir from '../../ir';

function optimizeBlock(block: ir.IrBlock) {
    // const program = block.program;
    // let i = 0;
    // while (i < block.body.length) {
    //     const stmt = block.body[i];
    //     switch (stmt.kind) {
    //         case ir.IrStmtType.Temp: {
    //             const expr = stmt.expr;
    //             switch (expr.kind) {
    //                 case ir.IrExprType.NewInstance: {
    //                     instances[expr.instanceId] = stmt as InstanceAssignment;
    //                     break;
    //                 }
    //                 case ir.IrExprType.Set: {
    //                     const target = expr.expr;
    //                     if (target.kind === ir.IrExprType.Temp) {
    //                         const block = program.getBlock(target.blockId);
    //                         const instance = instances.getInstance(target.blockId, target.varId);
    //                         if (instance !== undefined) {
    //                             const meta = block.instances[instance.expr.instanceId];
    //                             // TODO
    //                             // if (meta.canRelocate) {
    //                                 // if this instance can still relocate, we can safely add this set to the declaration
    //                                 meta.constructorExpr.expr.push({
    //                                     key: expr.property,
    //                                     value: expr.value,
    //                                 });
    //                                 block.body.splice(i--, 1);
    //                             // }
    //                         }
    //                     }
    //                     break;
    //                 }
    //             }
    //             break;
    //         }
    //     }
    //     ++i;
    // }
    // u.applyToNextBlocks((b) => optimizeBlock(b, instances.copy()), block);
}

// TODO: replace `simplfyExpr` use with constraint solver
export function optimizeFunction(firstBlock: ir.IrBlock) {
    // optimizeBlock(firstBlock, new InstanceMap());
}
