import Ast from './ast';
import { Constraint } from './constraint';

export const enum BindingType {
    Arg,
    Var,
    Let,
    Const,
    Function,
    ArrowFunction,
}

export class Binding {
    kind: BindingType;
    name: string;
    source?: Ast;
    initializer?: Ast;
    constraints: Constraint[] = [];

    constructor(kind: BindingType, name: string, source?: Ast, initializer?: any) {
        this.kind = kind;
        this.name = name;
        this.source = source;
        this.initializer = initializer;
    }
}
