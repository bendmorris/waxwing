import * as ir from '../ir';
import { Ast } from '../ast';
import { FunctionDefinition } from '../ir/function';
import * as t from '@babel/types';

const enum ScopeType {
    FunctionScope,
    BlockScope,
}

export class IrScope {
    program: ir.IrProgram;
    scopeType: ScopeType;
    parent?: IrScope;
    functionScope?: IrScope;
    bindings: Record<string, number>;

    constructor(program: ir.IrProgram, scopeType: ScopeType, parent?: IrScope) {
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

    childBlock() {
        return new IrScope(this.program, ScopeType.BlockScope, this);
    }

    getBinding(lval: t.LVal): number | undefined {
        switch (lval.type) {
            case 'Identifier': {
                return this.bindings[lval.name];
            }
        }
        return undefined;
    }

    setBinding(lval: t.LVal, id: number) {
        switch (lval.type) {
            case 'Identifier': {
                this.bindings[lval.name] = id;
                break;
            }
        }
    }

    findScopeWithBinding(name: string) {
        let current: IrScope | undefined = this;
        while (current && current.bindings[name] === undefined) {
            current = current.parent;
        }
        return current;
    }
}

/**
 * Break down an AST node, returning a TrivialExpr. If this requires
 * decomposing, additional assignments will be added to `block`.
 */
function decomposeExpr(ctx: IrScope, block: ir.IrBlock, ast: Ast): ir.TrivialExpr {
    // TODO: this should also return an lvalue if the expression is one
    function decompose(x: Ast) {
        return decomposeExpr(ctx, block, x);
    }
    function local(id: number) {
        return ir.exprIdentifierLocal(block.id, id);
    }
    switch (ast.type) {
        case 'Identifier': {
            const found = ctx.findScopeWithBinding(ast.name);
            if (found) {
                return local(ctx.getBinding(ast));
            } else {
                return ir.exprIdentifierGlobal(ast.name);
            }
        }
        case 'NumericLiteral':
        case 'BooleanLiteral':
        case 'StringLiteral': {
            return ir.exprLiteral(ast.value);
        }
        case 'NullLiteral': {
            return ir.exprLiteral(null);
        }
        case 'UnaryExpression': {
            const decomposed = decompose(ast.argument);
            const id = block.nextLocal();
            block.assign().local(id).unop(ast.operator, ast.prefix, decomposed);
            return local(id);
        }
        // case 'UpdateExpression': {
        //     const updateOps: Record<string, BinaryOperator> = {
        //         '++': '+',
        //         '--': '-',
        //     };
        //     if (ast.prefix) {
        //         // prefix: provide the original value, and also update it
        //         const decomposed = decompose(ast.argument);
        //         const id = ctx.nextLocal();
        //         block.assign().local(id).binop(updateOps[ast.operator], decomposed, exprLiteral(1));
        //         // TODO: update binding
        //         return ir.exprIdentifierLocal(id);
        //     } else {
        //         // suffix: update the value and use that new identifier
        //         const decomposed = decompose(ast.argument);
        //         const id = ctx.nextLocal();
        //         block.assign().local(id).binop(updateOps[ast.operator], decomposed, exprLiteral(1));
        //         // TODO: update binding
        //         return ir.exprIdentifierLocal(id);
        //     }
        // }
        case 'BinaryExpression':
        case 'LogicalExpression': {
            const decomposedLeft = decompose(ast.left),
                 decomposedRight = decompose(ast.right);
            const id = block.nextLocal();
            block.assign().local(id).binop(ast.operator, decomposedLeft, decomposedRight);
            return local(id);
        }
        case 'CallExpression':
        case 'NewExpression': {
            const callee = decompose(ast.callee),
                args = ast.arguments.map(decompose);
            const id = block.nextLocal();
            block.assign().local(id).call(callee, args, ast.type === 'NewExpression');
            return local(id);
        }
        case 'MemberExpression': {
            const expr = decompose(ast.object),
                prop = ast.computed ? decompose(ast.property) : ir.exprLiteral((ast.property as t.Identifier).name);
            const id = block.nextLocal();
            block.assign().local(id).property(expr, prop);
            return local(id);
        }
    }
    // we don't know what this is, so treat it as an opaque, effectful expression
    return ir.exprRaw(ast);
}

/**
 * Compile a babel AST node, adding WWIR statements to a block. This function
 * directly handles statements; expressions are handled in
 * `decomposeExpr`.
 */
function compileStmt(ctx: IrScope, block: ir.IrBlock, ast: Ast) {
    function recurse(x: Ast) {
        compileStmt(ctx, block, x);
    }
    function decompose(x: Ast) {
        return decomposeExpr(ctx, block, x);
    }
    switch (ast.type) {
        case 'BlockStatement': {
            for (const stmt of ast.body) {
                compileStmt(ctx.childBlock(), block, stmt);
            }
            break;
        }
        case 'VariableDeclaration': {
            for (const decl of ast.declarations) {
                switch (decl.id.type) {
                    case 'Identifier': {
                        const decomposed = decl.init ? decompose(decl.init) : ir.exprLiteral(undefined);
                        if (decomposed.kind !== ir.IrExprType.Identifier) {
                            const id = block.nextLocal();
                            block.assign().local(id).expr(decomposed);
                            if (ast.kind === 'var') {
                                ctx.functionScope.setBinding(decl.id, id);
                            } else {
                                ctx.setBinding(decl.id, id);
                            }
                        }
                        break;
                    }
                    default: {
                        throw "TODO: not yet supported";
                    }
                }
            }
            break;
        }
        case 'IfStatement': {
            const condition = decompose(ast.test);
            const stmt = block.if();
            stmt.condition(condition);
            compileStmt(ctx.childBlock(), stmt.body(), ast.consequent);
            if (ast.alternate) {
                compileStmt(ctx.childBlock(), stmt.else(), ast.alternate);
            }
            break;
        }
        case 'ForStatement': {
            recurse(ast.init);
            const condition = decompose(ast.test);
            const stmt = block.while();
            stmt.expr(condition);
            const body = stmt.body();
            compileStmt(ctx.childBlock(), body, ast.body);
            compileStmt(ctx, body, ast.update);
            break;
        }
        // TODO
        // case 'ForInStatement': {
        //     break;
        // }
        // case 'ForOfStatement': {
        //     break;
        // }
        case 'DoWhileStatement':
        case 'WhileStatement': {
            const condition = decompose(ast.test);
            const stmt = ast.type === 'DoWhileStatement' ? block.doWhile() : block.while();
            stmt.expr(condition);
            compileStmt(ctx.childBlock(), stmt.body(), ast.body);
            break;
        }
        case 'BreakStatement': {
            block.break();
            break;
        }
        case 'ContinueStatement': {
            block.continue();
            break;
        }
        case 'ReturnStatement': {
            block.return(ast.argument ? decompose(ast.argument) : ir.exprLiteral(undefined));
            break;
        }
        case 'FunctionDeclaration': {
            const def = new FunctionDefinition(ctx.program);
            def.name = ast.id.name;
            block.function(def);
            compileStmt(ctx.childFunction(), def.body, ast.body);
            break;
        }
        case 'ExpressionStatement': {
            recurse(ast.expression);
            break;
        }
        default: {
            const decomposed = decompose(ast);
            if (decomposed.kind !== ir.IrExprType.Identifier) {
                block.assign().local(block.nextLocal()).expr(decomposed);
            }
        }
    }
}

/**
 * Generate a WWIR program block from a Babel AST node.
 */
export function irCompile(body: Ast[]): ir.IrProgram {
    const program = new ir.IrProgram();
    const ctx = new IrScope(program, ScopeType.FunctionScope);
    const block = program.block();
    // TODO: we need an initial pass to find `var` and function declarations...
    // the initial pass should attach persistent scopes to the AST statements,
    // which also need to be attached to the blocks themselves
    for (const ast of body) {
        compileStmt(ctx, block, ast);
    }
    return program;
}
