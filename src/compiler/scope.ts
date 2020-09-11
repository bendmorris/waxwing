import * as ir from '../ir';
import * as t from '@babel/types';

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

    getBinding(lval: t.LVal): ir.TempVar | undefined {
        switch (lval.type) {
            case 'Identifier': {
                return this.bindings[lval.name];
            }
        }
        return undefined;
    }

    setBinding(lval: t.LVal, temp: ir.TempVar) {
        switch (lval.type) {
            case 'Identifier': {
                this.bindings[lval.name] = temp;
                break;
            }
        }
    }

    findScopeWithBinding(name: string): IrScope | undefined {
        let current: IrScope | undefined = this;
        while (current && current.bindings[name] === undefined) {
            current = current.parent;
        }
        return current;
    }
}
