import * as babelTypes from '@babel/types';
import { Ast } from '../ast';
import { Value, ValueType } from '../value';

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
