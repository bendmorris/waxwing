import { Effect } from './effect';
import * as babel from '@babel/core';
import * as t from '@babel/types';
import { Binding} from './scope';
import { Value } from './value';

interface AstData {
    enterEffects: Effect[],
    exitEffects: Effect[],
    knownValue: Value,
    resolution: Binding,
}

export type Ast = babel.Node & Partial<AstData>;
export type ExpressionAst = t.Expression & Partial<AstData>;

export function addEnterEffect(ast: Ast, effect: Effect) {
    if (!ast.enterEffects) {
        ast.enterEffects = [];
    }
    ast.enterEffects.push(effect);
}

export function addExitEffect(ast: Ast, effect: Effect) {
    if (!ast.exitEffects) {
        ast.exitEffects = [];
    }
    ast.exitEffects.push(effect);
}
