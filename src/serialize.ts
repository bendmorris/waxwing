import Ast from './ast';
import * as babel from '@babel/core';

export default function serializeAst(ast: Ast): string {
    const { code } = babel.transformFromAstSync(ast);
    return code + '\n';
}
