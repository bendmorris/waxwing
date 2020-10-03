import { IrBlock } from './block';
import { IrProgram } from './program';
import { Ast } from '../ast';

export interface FunctionArg {
    name: string,
    defaultValue?: any,
}

export class IrFunction {
    ast: Ast;
    program: IrProgram;
    name?: string;
    isArrow: boolean;
    args: FunctionArg[];
    restParam?: string;
    parent: IrFunction;
    blocks: IrBlock[];
    terminalBlocks: Set<IrBlock>;

    constructor(ast: Ast, program: IrProgram, parent?: IrFunction) {
        this.ast = ast;
        this.program = program;
        this.name = undefined;
        this.isArrow = false;
        this.args = [];
        this.restParam = undefined;
        this.parent = parent;
        this.blocks = [];
        this.terminalBlocks = new Set();
        this.block();
    }

    get body() { return this.blocks[0]; }

    block(): IrBlock {
        const newBlock = new IrBlock(this);
        newBlock.id = this.program.blocks.length;
        this.blocks.push(newBlock);
        this.program.blocks.push(newBlock);
        return newBlock;
    }

    toString(): string {
        const args = this.args.map((arg) => arg.name + (arg.defaultValue === undefined ? '' : ` = ${String(arg.defaultValue)}`));
        if (this.restParam) {
            args.push('...' + this.restParam);
        }
        return `function${this.name ? (' ' + this.name) : ''}(${args.join(', ')}) goto ${this.body.id}`;
    }
}
