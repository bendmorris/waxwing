import { Options } from '../options';
import { Ast, parseFile } from '../ast';
import { irCompile } from './compile';
import { irSerialize } from './serialize';

export function compile(options: Options): string {
    let input: Ast;
    if (typeof options.input === 'string') {
        input = parseFile(options.input);
    } else {
        input = options.input;
    }

    // compile AST into an IrBlock
    const ir = irCompile(input);

    // serialize IR into a JS string
    return irSerialize(ir);
}
