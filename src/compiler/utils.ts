import * as babelTypes from '@babel/types';
import { Ast } from '../ast';
import { Value, ValueType, abstractValue, concreteValue } from '../value';
import { ExecutionContext } from './context';
import { evaluate } from './evaluate';

export function evalValue(ctx: ExecutionContext, value: Value): Value {
    switch (value.kind) {
        case ValueType.Concrete:
            return value;
        case ValueType.Abstract: {
            const evaluated = evaluate(ctx, value.ast);
            const known = knownValue(ctx, evaluated || value.ast);
            if (known) {
                return known;
            } else {
                return evalValue(ctx, abstractValue(evaluated));
            }
        }
    }
    return value;
}

export function knownValue(ctx: ExecutionContext, ast: Ast): Value | undefined {
    switch (ast.type) {
        case "StringLiteral":
        case "NumericLiteral":
        case "BooleanLiteral":
            return concreteValue(ast.value);
        case "NullLiteral":
            return concreteValue(null);
        case "RegExpLiteral":
            // TODO
            return concreteValue(new RegExp(ast.pattern));

        case "Identifier":
            if (ctx) {
                const resolved = ctx.resolve(ast.name);
                if (resolved) {
                    return resolved.value;
                }
            }
            return undefined;
    }
    return undefined;
}

export function valueToNode(value: Value): Ast | undefined {
    switch (value.kind) {
        case ValueType.Concrete:
            return anyToNode(value.value);
        case ValueType.Abstract:
            return value.ast;
        case ValueType.Function:
            // TODO
            return undefined;
    }
}

export function anyToNode(value: any): Ast | undefined {
    switch (typeof value) {
        case "string":
            return babelTypes.stringLiteral(value);
        case "number":
            return babelTypes.numericLiteral(value);
        case "boolean":
            return babelTypes.booleanLiteral(value);
        case "undefined":
            return babelTypes.identifier('undefined');
        case "object":
            if (value === null) {
                return babelTypes.nullLiteral();
            }
            break;
    }
    return undefined;
}

export function sameLocation(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}