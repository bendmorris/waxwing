import { Ast } from '../ast';
import { Binding, Scope } from '../scope';
import Logger from '../logger';
import { Options } from '../options';
import { Value } from '../value';
import analyze from './analyze';
import optimize from './optimize';

export class CompileContext {
    options: Options;
    log: Logger;

    constructor(options: Options) {
        this.options = options;
        this.log = new Logger(options.verbose);
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
    log: Logger;

    constructor(compileContext: CompileContext, scopes: Scope[]) {
        this.compileContext = compileContext;
        this.scopes = scopes;
        this.log = compileContext.log;
    }

    resolve(name: string): Binding | undefined {
        return Scope.resolve(name, this.scopes);
    }

    compile(ast: Ast): Ast {
        analyze(this, ast);
        optimize(this, ast);
        return ast;
    }
}
