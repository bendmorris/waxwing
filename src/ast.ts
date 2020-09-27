import fs from 'fs';
import * as t from '@babel/types';
import * as babelParser from '@babel/parser';

export type Ast = t.Node;
export type AstProgram = t.Program;
export type AstFile = t.File;

export function parseFile(path: string): AstFile {
    return parse(fs.readFileSync(path).toString(), {
        sourceFilename: path
    });
}

export function parse(code: string, options: babelParser.ParserOptions): AstFile {
    return babelParser.parse(code, options);
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

export function fspan(file: string, span: Span) {
    return { file, ...span };
}

export function fileSpan(file: string, startLine: number, startColumn: number, endLine: number, endColumn: number): SourceSpan {
    return {
        file,
        start: { line: startLine, column: startColumn },
        end: { line: endLine, column: endColumn },
    };
}
