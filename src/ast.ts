import { Effect } from './effect';
import Scope from './scope';
import * as babel from '@babel/core';

interface AstData {
    effects: Effect[],
}

export type Ast = babel.Node & AstData;
export function addEffect(ast: Ast, effect: Effect) {
    if (!ast.effects) {
        ast.effects = [];
    }
    ast.effects.push(effect);
}
