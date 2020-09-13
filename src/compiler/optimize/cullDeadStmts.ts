import * as ir from '../../ir';

export function optimizeBlock(block: ir.IrBlock) {
    let i = 0;
    while (i < block.body.length) {
        if (block.body[i].live) {
            ++i;
        } else {
            block.body.splice(i, 1);
        }
    }
}
