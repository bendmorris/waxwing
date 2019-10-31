import { Ast } from '../ast';
import Scope from '../scope';
import { Options } from '../options';
import { Value } from '../value';
import findDeclarations from './findDeclarations';
import localOptimizations from './localOptimizations';

export class CompileContext {
    options: Options;

    constructor(options: Options) {
        this.options = options;
    }

    compile(ast: Ast): Ast {
        const globalScope = new Scope();
        const topLevelContext = new ExecutionContext(this, [globalScope]);
        return topLevelContext.compile(ast);
    }
}

export class ExecutionContext {
    compileContext: CompileContext;
    scopes: Scope[];

    constructor(compileContext: CompileContext, scopes: Scope[]) {
        this.compileContext = compileContext;
        this.scopes = scopes;
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
