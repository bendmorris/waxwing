import { Ast } from '../ast';
import { Binding, Scope } from '../scope';
import { Options } from '../options';
import { Value } from '../value';
import findEffects from './findEffects';
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

    debugLog(...args) {
        if (this.options.debug) {
            if (typeof args[0] === 'object' && typeof args[0].loc === 'object') {
                const loc = args[0].loc;
                args[0] = `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}:`;
            }
            console.warn(...args);
        }
    }
}

export class ExecutionContext {
    compileContext: CompileContext;
    scopes: Scope[];

    constructor(compileContext: CompileContext, scopes: Scope[]) {
        this.compileContext = compileContext;
        this.scopes = scopes;
    }

    resolve(name: string): Binding | undefined {
        return Scope.resolve(name, this.scopes);
    }

    compile(ast: Ast): Ast {
        findEffects(ast);
        localOptimizations(this, ast);
        return ast;
    }

    debugLog(...args) {
        if (this.compileContext.options.debug) {
            this.compileContext.debugLog(...args);
        }
    }
}
