import * as ir from '../../ir';
import { isLive } from '../liveness';

export function optimizeBlock(block: ir.IrBlock) {
    let i = 0;
    while (i < block.body.length) {
        if (isLive(block.body[i])) {
            ++i;
        } else {
            block.body.splice(i, 1);
        }
    }
}
