import fs from 'fs';
import * as babel from '@babel/core';
import * as babelParser from '@babel/parser';

export type Ast = babel.Node;

export function parseFile(path: string): Ast {
    return parse(fs.readFileSync(path).toString(), {
        sourceFilename: path
    });
}

export function parse(code: string, options: babelParser.ParserOptions): Ast {
    return babelParser.parse(code, options);
}
