import * as ir from '../ir';

export const enum ScopeType {
    FunctionScope,
    BlockScope,
}

export class IrScope {
    program: ir.IrProgram;
    scopeType: ScopeType;
    id: number;
    parent?: IrScope;
    functionScope?: IrScope;
    bindings: Record<string, ir.TempVar>;

    constructor(program: ir.IrProgram, scopeType: ScopeType, parent?: IrScope) {
        this.id = parent ? (parent.id + 1) : 0;
        this.program = program;
        this.scopeType = scopeType;
        this.parent = parent;
        // if this is a block scope, the closest parent function scope is ours
        this.functionScope = this;
        while (this.functionScope && this.functionScope.scopeType !== ScopeType.FunctionScope) {
            this.functionScope = this.functionScope.parent;
        }
        this.bindings = {};
    }

    childFunction() {
        return new IrScope(this.program, ScopeType.FunctionScope, this);
    }

    childBlockScope() {
        return new IrScope(this.program, ScopeType.BlockScope, this);
    }

    getBinding(name: string): ir.TempVar | undefined {
        return this.bindings[name];
    }

    setBinding(name: string, temp: ir.TempVar) {
        this.bindings[name] = temp;
    }

    findScopeWithBinding(name: string): IrScope | undefined {
        let current: IrScope | undefined = this;
        while (current && current.bindings[name] === undefined) {
            current = current.parent;
        }
        return current;
    }
}
