import fs from 'fs';
import * as babel from '@babel/core';
import * as babelParser from '@babel/parser';

export type Ast = babel.Node;

export function parseFile(path: string): Ast[] {
    return parse(fs.readFileSync(path).toString(), {
        sourceFilename: path
    });
}

export function parse(code: string, options: babelParser.ParserOptions): Ast[] {
    return babelParser.parse(code, options).program.body;
}

export interface SourcePos {
    line: number,
    column: number,
}

export interface Span {
    start: SourcePos,
    end: SourcePos,
}

export interface SourceSpan extends Span {
    file: string,
}

export function fileSpan(file: string, startLine: number, startColumn: number, endLine: number, endColumn: number): SourceSpan {
    return {
        file,
        start: { line: startLine, column: startColumn },
        end: { line: endLine, column: endColumn },
    };
}
