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

export class IrScope {
    program: ir.IrProgram;
    id: number;
    // if `function` is `undefined`, this is a block scope
    function?: ir.IrFunction;
    parent?: IrScope;
    functionScope?: IrScope;
    varNames: Set<string>;
    functionNames: Record<string, IrFunction>;
    // FIXME: bindings should be a list of TempVar, for closures to see all possible values
    bindings: Record<string, ir.TempVar>;

    constructor(program: ir.IrProgram, irFunction?: ir.IrFunction, parent?: IrScope) {
        this.program = program;
        this.id = parent ? (parent.id + 1) : 0;
        this.function = irFunction;
        this.parent = parent;
        // if this is a block scope, the closest parent function scope is ours
        this.functionScope = this;
        while (this.functionScope && !this.functionScope.function) {
            this.functionScope = this.functionScope.parent;
        }
        this.varNames = new Set();
        this.functionNames = {};
        this.bindings = {};
    }

    childFunction(irFunction: ir.IrFunction) {
        return new IrScope(this.program, irFunction, this);
    }

    childBlockScope() {
        return new IrScope(this.program, undefined, this);
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
