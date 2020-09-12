import { IrBlock } from './block';

export class IrProgram {
    blocks: IrBlock[];

    constructor() {
        this.blocks = [];
    }

    block(): IrBlock {
        const newBlock = new IrBlock(this);
        newBlock.id = this.blocks.length;
        this.blocks.push(newBlock);
        return newBlock;
    }

    toString(): string {
        return this.blocks.map((block) => `${block.id}:\n${block.toString()}${block.nextBlock ? ('(goto ' + block.nextBlock.id + ')\n') : ''}`).join('\n');
    }

    getBlock(blockId: number) { return this.blocks[blockId]; }
}
