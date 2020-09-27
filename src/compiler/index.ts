import { Options } from '../options';
import { AstFile, parseFile } from '../ast';
import { irCompile } from './compile';
import { irSerialize } from './serialize';
import { optimizeProgram } from './optimize';
import * as log from '../log';

/**
 * This is the main compiler entry point.
 *
 * - Parses the input specified in `options` into JS
 * - Compiles the JS AST into WWIR
 * - Performs optimization passes
 * - Serializes the optimized WWIR into a JS source string
 */
export function compile(options: Options): string {
    let input: AstFile;
    if (typeof options.input === 'string') {
        log.logInfo(`parsing file: ${options.input}`);
        input = parseFile(options.input);
    } else {
        log.logInfo('compiling Babel AST');
        input = options.input;
    }

    // compile AST into an IrBlock
    const ir = irCompile(input);

    log.logInfo('initial IR:', () => ir.toString());

    if (options.outputIr) {
        return ir.toString();
    }

    optimizeProgram(ir);

    // serialize IR into a JS string
    return irSerialize(ir, options);
}
