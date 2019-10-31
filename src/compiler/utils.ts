import * as babelTypes from '@babel/types';
import { Ast } from '../ast';
import { Value, ValueType } from '../value';
import { ExecutionContext } from './context';

export function knownValue(ctx: ExecutionContext, ast: Ast): Value | undefined {
    switch (ast.type) {
        case "StringLiteral":
        case "NumericLiteral":
        case "BooleanLiteral":
            return { kind: ValueType.Concrete, value: ast.value };
        case "NullLiteral":
            return { kind: ValueType.Concrete, value: null };
        case "RegExpLiteral":
            // TODO
            return { kind: ValueType.Concrete, value: new RegExp(ast.pattern) };

        case "Identifier":
            return ctx ? ctx.resolve(ast.name) : undefined;
    }
    return undefined;
}

export function anyToNode(value: any): Ast | undefined {
    switch (typeof value) {
        case "string":
            return babelTypes.stringLiteral(value) as Ast;
        case "number":
            return babelTypes.numericLiteral(value) as Ast;
        case "boolean":
            return babelTypes.booleanLiteral(value) as Ast;
        case "undefined":
            return babelTypes.identifier('undefined') as Ast;
        case "object":
            if (value === null) {
                return babelTypes.nullLiteral() as Ast;
            }
            break;
    }
    return undefined;
}