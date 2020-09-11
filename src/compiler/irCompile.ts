import * as ir from '../ir';
import { Ast } from '../ast';
import * as t from '@babel/types';

const enum ScopeType {
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

/**
 * Break down an AST node, returning a IrTrivialExpr. If this requires
 * decomposing, additional assignments will be added to `block`.
 */
function decomposeExpr(ctx: IrScope, block: ir.IrBlock, ast: Ast): ir.IrTrivialExpr {
    // TODO: this should also return an lvalue if the expression is one
    function decompose(x: Ast) {
        return decomposeExpr(ctx, block, x);
    }
    function temp(id: number) {
        return ir.exprTemp(block.id, id);
    }
    if (ast === null) {
        throw new Error("attempting to decompose null AST");
    }
    switch (ast.type) {
        case 'AssignmentExpression': {
            switch (ast.operator) {
                case '=': {
                    // FIXME: update binding
                    const decomposed = decompose(ast.right);
                    const id = block.nextTemp();
                    block.temp(block.id, id).expr(decomposed).finish();
                    return temp(id);
                }
                default: {
                    throw new Error('TODO');
                }
            }
        }
        case 'Identifier': {
            const found = ctx.findScopeWithBinding(ast.name);
            if (found) {
                const binding = found.getBinding(ast);
                if (binding !== undefined) {
                    return ir.exprTemp(binding.blockId, binding.varId);
                }
            }
            return ir.exprIdentifierGlobal(ast.name);
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
            const id = block.nextTemp();
            block.temp(block.id, id).unop(ast.operator, ast.prefix, decomposed).finish();
            return temp(id);
        }
        case 'UpdateExpression': {
            const updateOps: Record<string, ir.BinaryOperator> = {
                '++': '+',
                '--': '-',
            };
            if (ast.prefix) {
                // prefix: provide the original value, and also update it
                const decomposed = decompose(ast.argument);
                const id = block.nextTemp();
                block.temp(block.id, id).binop(updateOps[ast.operator], decomposed, ir.exprLiteral(1)).finish();
                // ctx.setBinding(decomposed.lvalue, temp(block.id, id));
                return temp(id);
            } else {
                // suffix: update the value and use that new identifier
                const decomposed = decompose(ast.argument);
                const id = block.nextTemp();
                block.temp(block.id, id).binop(updateOps[ast.operator], decomposed, ir.exprLiteral(1)).finish();
                // ctx.setBinding(decomposed.lvalue, temp(block.id, id));
                return decomposed;
            }
        }
        case 'BinaryExpression':
        case 'LogicalExpression': {
            const decomposedLeft = decompose(ast.left),
                 decomposedRight = decompose(ast.right);
            const id = block.nextTemp();
            block.temp(block.id, id).binop(ast.operator, decomposedLeft, decomposedRight).finish();
            return temp(id);
        }
        case 'CallExpression':
        case 'NewExpression': {
            const callee = decompose(ast.callee),
                args = ast.arguments.map(decompose);
            const id = block.nextTemp();
            const stmt = block.temp(block.id, id).call(callee, args, ast.type === 'NewExpression').finish();
            stmt.effects.push(ir.effectIo());
            return temp(id);
        }
        case 'MemberExpression': {
            const expr = decompose(ast.object),
                prop = ast.computed ? decompose(ast.property) : ir.exprLiteral((ast.property as t.Identifier).name);
            const id = block.nextTemp();
            block.temp(block.id, id).property(expr, prop).finish();
            return temp(id);
        }
        case 'ArrayExpression': {
            const id = block.nextTemp();
            const instanceId = block.nextInstance();
            block.temp(block.id, id).expr(ir.exprEmptyArray(instanceId)).finish();
            for (const value of ast.elements) {
                const val = decompose(value);
                const stmt = block.set().object(temp(id)).expr(val).finish();
                const newGeneration = block.nextGeneration(instanceId);
                stmt.effects.push(ir.effectMutation(instanceId, newGeneration));
            }
            return temp(id);
        }
        case 'ObjectExpression': {
            const id = block.nextTemp();
            const instanceId = block.nextInstance();
            block.temp(block.id, id).expr(ir.exprEmptyObject(instanceId)).finish();
            for (const value of ast.properties) {
                switch (value.type) {
                    case 'ObjectMethod': {
                        // TODO
                        break;
                    }
                    case 'ObjectProperty': {
                        const key = value.key.type == 'Identifier' ? ir.exprLiteral(value.key.name) : decompose(value.key);
                        const val = decompose(value.value);
                        const stmt = block.set().object(temp(id)).propertyName(key).expr(val).finish();
                        const newGeneration = block.nextGeneration(instanceId);
                        stmt.effects.push(ir.effectMutation(instanceId, newGeneration));
                        break;
                    }
                    case 'SpreadElement': {
                        // TODO
                        break;
                    }
                }
            }
            return temp(id);
        }
        case 'FunctionExpression': {
            const def = new ir.FunctionDefinition(ctx.program);
            def.name = ast.id ? ast.id.name : undefined;
            compileStmt(ctx.childFunction(), def.body, ast.body);
            const id = block.nextTemp();
            block.temp(block.id, id).expr(ir.exprFunction(def)).finish();
            return temp(id);
        }
        case 'SequenceExpression': {
            let last;
            for (const expr of ast.expressions) {
                last = decompose(expr);
            }
            return last;
        }
        case 'ConditionalExpression': {
            const condition = decompose(ast.test);
            const bodyExpr = decompose(ast.consequent);
            const elseExpr = decompose(ast.alternate);
            const stmt = block.if();
            stmt.condition(condition);
            const phiVar = block.nextTemp();
            const bodyBlock = stmt.body(),
                elseBlock = stmt.else();
            const bodyVar = bodyBlock.nextTemp(),
                elseVar = elseBlock.nextTemp();
            bodyBlock.temp(stmt.body().id, bodyVar).expr(bodyExpr).finish();
            elseBlock.temp(stmt.else().id, elseVar).expr(elseExpr).finish();
            stmt.finish();
            // FIXME: better way to split basic blocks? this phi goes in the next one
            block.temp(block.id, phiVar).expr(ir.exprPhi([ir.temp(bodyBlock.id, bodyVar), ir.temp(elseBlock.id, elseVar)])).finish();
            return ir.exprTemp(block.id, phiVar);
        }
    }
    // we don't know what this is, so treat it as an opaque, effectful expression
    // TODO: warning
    return ir.exprRaw(ast);
}

function isBlockBoundary(stmt: ir.IrStmt) {
    switch (stmt.kind) {
        case ir.IrStmtType.If:
        case ir.IrStmtType.Loop: {
            return true;
        }
    }
    return false;
}

/**
 * Compile a babel AST node, adding WWIR statements to a block. This function
 * directly handles statements; expressions are handled in
 * `decomposeExpr`.
 */
function compileStmt(ctx: IrScope, block: ir.IrBlock, ast: Ast) {
    const program = block.program;
    function recurse(x: Ast) {
        return compileStmt(ctx, block, x);
    }
    function decompose(x: Ast) {
        return decomposeExpr(ctx, block, x);
    }
    if (ast === null) {
        throw new Error("attempting to compile null AST");
    }
    switch (ast.type) {
        case 'BlockStatement': {
            const scope = ctx.childBlockScope();
            compileBlock:
            for (const stmt of ast.body) {
                const last = block.lastStmt();
                if (last) {
                    switch (last.kind) {
                        case ir.IrStmtType.Break:
                        case ir.IrStmtType.Continue:
                        case ir.IrStmtType.Return: {
                            break compileBlock;
                        }
                        case ir.IrStmtType.If:
                        case ir.IrStmtType.Loop: {
                            // FIXME: use a cursor with a reference to the block, do this automatically
                            const next = program.block();
                            block.continued = next;
                            block = next;
                            break;
                        }
                    }
                }
                compileStmt(scope, block, stmt);
            }
            break;
        }
        case 'VariableDeclaration': {
            for (const decl of ast.declarations) {
                switch (decl.id.type) {
                    case 'Identifier': {
                        const decomposed = decl.init ? decompose(decl.init) : ir.exprLiteral(undefined);
                        let id;
                        if (decomposed.kind === ir.IrExprType.Temp) {
                            id = decomposed.varId;
                        } else {
                            id = block.nextTemp();
                            block.temp(block.id, id).expr(decomposed).finish();
                        }
                        const scope = ast.kind === 'var' ? ctx.functionScope : ctx;
                        scope.setBinding(decl.id, ir.temp(block.id, id));
                        block.addDeclaration(scope.id, decl.id.name, id);
                        break;
                    }
                    default: {
                        throw new Error("TODO: non-identifier assignment patterns not yet supported");
                    }
                }
            }
            break;
        }
        case 'IfStatement': {
            const condition = decompose(ast.test);
            const stmt = block.if();
            stmt.condition(condition);
            compileStmt(ctx.childBlockScope(), stmt.body(), ast.consequent);
            if (ast.alternate) {
                compileStmt(ctx.childBlockScope(), stmt.else(), ast.alternate);
            }
            stmt.finish();
            break;
        }
        case 'ForStatement': {
            if (ast.init) {
                recurse(ast.init);
            }
            const condition = ast.test ? decompose(ast.test) : ir.exprLiteral(true);
            const stmt = block.while();
            stmt.expr(condition);
            const body = stmt.body();
            compileStmt(ctx.childBlockScope(), body, ast.body);
            if (ast.update) {
                compileStmt(ctx, body, ast.update);
            }
            stmt.finish();
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
            compileStmt(ctx.childBlockScope(), stmt.body(), ast.body);
            stmt.finish();
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
            const def = new ir.FunctionDefinition(ctx.program);
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
            if (decomposed.kind !== ir.IrExprType.Temp) {
                block.temp(block.id, block.nextTemp()).expr(decomposed).finish();
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
