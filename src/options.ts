import { Ast } from './ast';

export interface Options {
    input: string | Ast,
    out: string,
    optimizeForSize: boolean,
}

export function makeOptions(options: Partial<Options> = {}): Options {
    // ignore undefined options
    for (const key in options) {
        if (options[key] === undefined) {
            delete options[key];
        }
    }
    return Object.assign({
        input: "/dev/null",
        out: "-",
        optimizeForSize: false,
    }, options);
}
