import { Ast } from './ast';

interface ConcreteValue {
    value?: any,
}

interface FunctionValue {
    body: Ast,
    isArrowFunction: boolean,
}

interface AbstractValue {
    ast: Ast
}

type Value = ConcreteValue | FunctionValue | AbstractValue;

export default Value;
