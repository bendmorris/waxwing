import { Ast } from './ast';
import { Constraint } from './constraint';

export const enum ValueType {
    Concrete,
    Abstract,
    Function,
    Unknown
}

export interface ConcreteValue {
    kind: ValueType.Concrete,
    value?: any,
}

export function concreteValue(value?: any): ConcreteValue {
    return {
        kind: ValueType.Concrete,
        value,
    };
}

export interface FunctionValue {
    kind: ValueType.Function,
    body: Ast,
    isArrowFunction: boolean,
}

export function functionValue(body: Ast, isArrowFunction: boolean = false): FunctionValue {
    return {
        kind: ValueType.Function,
        body,
        isArrowFunction,
    };
}

export interface AbstractValue {
    kind: ValueType.Abstract,
    ast: Ast,
}

export function abstractValue(ast: Ast): AbstractValue {
    return {
        kind: ValueType.Abstract,
        ast,
    };
}

export interface UnknownValue {
    kind: ValueType.Unknown,
    constraints: Constraint[],
}

export function unknownValue(constraints: Constraint[] = []): UnknownValue {
    return {
        kind: ValueType.Unknown,
        constraints,
    };
}

export type Value = ConcreteValue | FunctionValue | AbstractValue | UnknownValue;
