import { Ast } from './ast';

export const enum ValueType {
    Concrete,
    Abstract,
    Function,
}

export interface ConcreteValue {
    kind: ValueType.Concrete,
    value?: any,
}

export interface FunctionValue {
    kind: ValueType.Function,
    body: Ast,
    isArrowFunction: boolean,
}

export interface AbstractValue {
    kind: ValueType.Abstract,
    ast: Ast
}

export type Value = ConcreteValue | FunctionValue | AbstractValue;
