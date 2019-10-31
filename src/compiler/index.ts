import { Ast } from '../ast';
import { CompileContext } from './context';
import { Options } from '../options';
import { parseFile } from '../parser';
import serialize from '../serialize';

export default function compile(options: Options): string {
    let input: Ast;
    if (typeof options.input === 'string') {
        input = parseFile(options.input);
    } else {
        input = options.input;
    }
    if (!input) {
        throw "Couldn't parse input " + options.input;
    }
    const context = new CompileContext(options);
    const result = context.compile(input);
    return serialize(result);
}
