import { AstFile } from './ast';

export interface Options {
    input: string | AstFile,
    out: string,
    optimizeForSize: boolean,
    verbose: number,
    outputIr: boolean,
    compact: boolean,
}

export function makeOptions(options: Partial<Options> = {}): Options {
    // ignore undefined options
    for (const key in options) {
        if (options[key] === undefined) {
            delete options[key];
        }
    }
    return Object.assign({
        input: undefined,
        out: "-",
        optimizeForSize: false,
        verbose: 0,
        outputIr: false,
        compact: false,
    }, options);
}
