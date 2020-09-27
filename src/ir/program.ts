import { IrBlock } from './block';
import { IrFunction } from './function';
import { Ast } from '../ast';

export class IrProgram {
    blocks: IrBlock[];
    globalFunction: IrFunction;
    functions: IrFunction[];
    _nextRegister: number;

    constructor(ast: Ast) {
        this.blocks = [];
        this.functions = [
            this.globalFunction = new IrFunction(ast, this)
        ];
        this.globalFunction.name = '<global function>';
        this._nextRegister = 0;
    }

    toString(): string {
        return this.blocks.map((block) => `${block.id}:\n${block.toString()}${block.nextBlock ? ('(continued ' + block.nextBlock.id + ')\n') : ''}`).join('\n');
    }

    getBlock(blockId: number) { return this.blocks[blockId]; }
    getTemp(blockId: number, varId: number) { return this.getBlock(blockId).getTempMetadata(varId); }
    getTempDefinition(blockId: number, varId: number) { return this.getBlock(blockId).getTempDefinition(varId); }
}
