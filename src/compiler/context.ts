import { Ast } from '../ast';
import Scope from '../scope';
import { Value } from '../value';
import findDeclarations from './findDeclarations';
import localOptimizations from './localOptimizations';

export class ExecutionContext {
    scopes: Scope[] = [];

    constructor() {
        const globalScope = new Scope();
        this.scopes.push(globalScope);
    }

    resolve(name: string): Value | undefined {
        return Scope.resolve(name, this.scopes);
    }

    compile(ast: Ast): Ast {
        findDeclarations(ast);
        localOptimizations(this, ast);
        return ast;
    }
}
