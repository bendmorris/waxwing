import { Options } from '../options';
import { Ast, parseFile } from '../ast';
import { irCompile } from './irCompile';
import { irSerialize } from './irSerialize';
import { program } from '@babel/types';

/**
 * This is the main compiler entry point.
 *
 * - Parses the input specified in `options` into JS
 * - Compiles the JS AST into WWIR
 * - Performs optimization passes
 * - Serializes the optimized WWIR into a JS source string
 */
export function compile(options: Options): string {
    let input: Ast[];
    if (typeof options.input === 'string') {
        input = parseFile(options.input);
    } else {
        input = options.input;
    }

    // compile AST into an IrBlock
    const ir = irCompile(input);

    if (options.outputIr) {
        return ir.toString();
    }

    // serialize IR into a JS string
    return irSerialize(ir);
}
