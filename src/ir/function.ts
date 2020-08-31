import { IrBlock } from './block';

export interface FunctionArg {
    name: string,
    defaultValue?: any,
}

export class FunctionDefinition {
    name?: string;
    isArrow: boolean;
    args: FunctionArg[];
    restParam?: string;
    body: IrBlock;
    
    constructor() {
        this.name = undefined;
        this.isArrow = false;
        this.args = [];
        this.restParam = undefined;
        this.body = new IrBlock();
    }

    description(): string {
        const args = this.args.map((arg) => arg.name + (arg.defaultValue === undefined ? '' : ` = ${String(arg.defaultValue)}`));
        if (this.restParam) {
            args.push('...' + this.restParam);
        }
        return `function${this.name ? (' ' + this.name) : ''}(${args.join(', ')})\n`;
    }
}
