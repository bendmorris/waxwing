import { Value } from './value';

export class Binding {
    scope: Scope;
    value: Value;
    refCount: number = 0;

    constructor(scope: Scope, value: Value) {
        this.scope = scope;
        this.value = value;
    }

    addRef() {
        ++this.refCount;
    }

    removeRef() {
        --this.refCount;
    }
}

export class Scope extends Map<string, Binding> {
    static resolve(name: string, scopes: Scope[]): Binding | undefined {
        for (let i = scopes.length - 1; i >= 0; --i) {
            if (scopes[i].has(name)) {
                return scopes[i].get(name);
            }
        }
        return;
    }

    createRef(name: string, value: Value) {
        this.set(name, new Binding(this, value));
    }

    addRef(name: string) {
        if (this.has(name)) {
            this.get(name).addRef();
        }
    }

    removeRef(name: string) {
        if (this.has(name)) {
            this.get(name).removeRef();
        }
    }
}
