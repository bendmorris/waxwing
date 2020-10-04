
export enum SymbolicType {
    Value,
    Function,
    Namespace,
}

export class SymbolicNamespace implements SymbolicBase {
    kind: SymbolicType.Namespace;
    names: Record<string, Symbolic>;

    constructor(names: Record<string, Symbolic>) {
        this.kind = SymbolicType.Namespace;
        this.names = names;
    }

    copy() { return new SymbolicNamespace({ ...this.names }); }
    define(name: string, value: Symbolic) { this.names[name] = value; }
}

export interface SymbolicBase {
    kind: SymbolicType,
}

export interface SymbolicValue extends SymbolicBase {
    kind: SymbolicType.Value,
    value?: any,
}

export function value(props: Partial<SymbolicValue> = {}): SymbolicValue {
    return {
        kind: SymbolicType.Value,
        ...props,
    };
}

export interface SymbolicFunction extends SymbolicBase {
    kind: SymbolicType.Function,
    compTime?: Function,
    caresAboutThis?: boolean,
}

export function func(props: Partial<SymbolicFunction> = {}): SymbolicFunction {
    return {
        kind: SymbolicType.Function,
        ...props,
    };
}

export type Symbolic = SymbolicValue | SymbolicFunction | SymbolicNamespace;

export function isConcrete(arg) {
    // TODO
    return false;
}

export function concreteWrapper(f: Function) {
    return function(...args) {
        for (const arg of args) {
            if (!isConcrete(arg)) {
                return value();
            }
        }
        return f.apply(null, args);
    }
}