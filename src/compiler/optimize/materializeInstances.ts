import * as ir from '../../ir';
import * as u from '../utils';
import { markStmtLive } from '../liveness';

function optimizeBlock(block: ir.IrBlock) {
    // for (const instanceId in block.instances) {
    //     const instance = block.instances[instanceId];
    //     if (instance.escapes) {
    //         // if this instance escapes, we need to fully materialize it
    //         instance.materialized = true;
    //     }
    // }
    u.applyToNextBlocks((b) => optimizeBlock(b), block);
}

export function optimizeFunction(firstBlock: ir.IrBlock) {
    optimizeBlock(firstBlock);
}
