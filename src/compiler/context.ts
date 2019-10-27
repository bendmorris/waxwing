import Ast from '../ast';
import { Binding } from '../binding';
import Scope from '../scope';
import findDeclarations from './findDeclarations';

export default class CompileContext {
    scopes: Scope[] = [];

    constructor() {
        const globalScope = new Scope();
        this.scopes.push(globalScope);
    }

    resolve(name: string): Binding | undefined {
        return Scope.resolve(name, this.scopes);
    }

    compile(ast: Ast): Ast {
        findDeclarations(this, ast);
        return ast;
    }
}
