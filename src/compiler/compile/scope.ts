import * as ir from '../../ir';
import * as t from '@babel/types';
import { IrFunction } from '../../ir';
import { BlockBuilder } from './builder';

export interface NodeMetadata {
    irFunction?: IrFunction,
    scope?: IrScope,
    builder?: BlockBuilder,
}
export type AnnotatedNode = t.Node & Partial<NodeMetadata>;

export interface ResolvedName {
    scope: IrScope,
    name: string,
    initialValue?: ir.TempVar,
}

export class IrScope {
    program: ir.IrProgram;
    id: number;
    // if `function` is `undefined`, this is a block scope
    function?: ir.IrFunction;
    parent?: IrScope;
    functionScope?: IrScope;
    names: Record<string, ResolvedName>;

    constructor(program: ir.IrProgram, irFunction?: ir.IrFunction, parent?: IrScope) {
        this.program = program;
        this.id = program._nextScope++;
        this.function = irFunction;
        this.parent = parent;
        // if this is a block scope, the closest parent function scope is ours
        this.functionScope = this;
        while (this.functionScope && !this.functionScope.function) {
            this.functionScope = this.functionScope.parent;
        }
        this.names = {};
    }

    childFunction(irFunction: ir.IrFunction) {
        return new IrScope(this.program, irFunction, this);
    }

    childBlockScope() {
        return new IrScope(this.program, undefined, this);
    }

    addName(name: string, initialValue: ir.TempVar | false) {
        this.names[name] = {
            scope: this,
            name,
            initialValue: initialValue || undefined,
        };
    }

    resolveName(name: string): ResolvedName | undefined {
        let current: IrScope | undefined = this;
        while (current) {
            const resolved = current.names[name]
            if (resolved) {
                return resolved;
            }
            current = current.parent;
        }
        return undefined;
    }
}
