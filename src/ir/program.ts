import { IrBlock } from './block';

export class IrProgram {
    blocks: IrBlock[];
    private _nextLocal: number;

    constructor() {
        this.blocks = [];
        this._nextLocal = 0;
    }

    nextLocal(): number {
        return this._nextLocal++;
    }

    block(): IrBlock {
        const newBlock = new IrBlock(this);
        newBlock.id = this.blocks.length;
        this.blocks.push(newBlock);
        return newBlock;
    }

    toString(): string {
        return this.blocks.map((block) => `${block.id}:\n${block.toString()}`).join('\n');
    }
}
