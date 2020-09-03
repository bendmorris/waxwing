import { IrBlock } from './block';
import { IrProgram } from './program';

export interface FunctionArg {
    name: string,
    defaultValue?: any,
}

export class FunctionDefinition {
    program: IrProgram;
    name?: string;
    isArrow: boolean;
    args: FunctionArg[];
    restParam?: string;
    body: IrBlock;
    
    constructor(program: IrProgram) {
        this.program = program;
        this.name = undefined;
        this.isArrow = false;
        this.args = [];
        this.restParam = undefined;
        this.body = program.block();
    }

    description(): string {
        const args = this.args.map((arg) => arg.name + (arg.defaultValue === undefined ? '' : ` = ${String(arg.defaultValue)}`));
        if (this.restParam) {
            args.push('...' + this.restParam);
        }
        return `function${this.name ? (' ' + this.name) : ''}(${args.join(', ')}) =>${this.body.id}`;
    }
}
