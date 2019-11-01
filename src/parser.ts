import { Ast } from './ast';
import * as babelParser from '@babel/parser';
import fs from 'fs';

export function parseFile(path: string): Ast {
    return parse(fs.readFileSync(path).toString(), {
        sourceFilename: path
    });
}

export function parse(code: string, options: babelParser.ParserOptions): Ast {
    return babelParser.parse(code, options);
}
