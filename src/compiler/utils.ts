import * as t from '@babel/types';
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
            return t.stringLiteral(value);
        case "number":
            return t.numericLiteral(value);
        case "boolean":
            return t.booleanLiteral(value);
        case "undefined":
            return t.identifier('undefined');
        case "object":
            if (value === null) {
                return t.nullLiteral();
            }
            break;
    }
    return undefined;
}

export function sameLocation(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
