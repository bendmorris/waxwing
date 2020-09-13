import * as ir from '../ir';
import { Ast } from '../ast';
import { markExprLive, markStmtLive } from './liveness';
import { IrScope, ScopeType } from './scope';
import * as t from '@babel/types';

function resolveLval(scope: IrScope, lval: t.LVal): { name?: string, lvalue: ir.Lvalue, scope?: IrScope, value?: ir.IrTempExpr } {
    switch (lval.type) {
        case 'Identifier': {
            const found = scope.findScopeWithBinding(lval.name);
            if (found) {
                const lvalue = ir.lvalueScoped(found.id, lval.name);
                const binding = found.getBinding(lval.name);
                return {
                    name: lval.name,
                    lvalue,
                    scope: found,
                    value: ir.exprTemp2(binding.blockId, binding.varId),
                };
            } else {
                return {
                    lvalue: ir.lvalueGlobal(lval.name),
                };
            }
        }
        default: {
            throw new Error(`TODO: resolve non-Identifier lvalues: ${JSON.stringify(lval)}`);
        }
    }
}

function updateLvalue(scope: IrScope, lval: t.LVal, temp: ir.TempVar) {
    const found = resolveLval(scope, lval);
    if (!found) {
        throw new Error(`couldn't resolve lvalue: ${lval}`);
    }
    if (found.scope) {
        found.scope.setBinding(found.name, temp);
    }
}

/**
 * Break down an AST node, returning a IrTrivialExpr. If this requires
 * decomposing, additional assignments will be added to `block`.
 */
function decomposeExpr(ctx: IrScope, block: ir.IrBlock, ast: Ast): ir.IrTrivialExpr {
    const program = block.program;
    function decompose(x: Ast) {
        return decomposeExpr(ctx, block, x);
    }
    function temp(id: number) {
        return ir.exprTemp2(block.id, id);
    }
    if (ast === null) {
        throw new Error("attempting to decompose null AST");
    }
    switch (ast.type) {
        case 'AssignmentExpression': {
            let decomposed;
            switch (ast.operator) {
                case '=': {
                    decomposed = decompose(ast.right);
                    break;
                }
                default: {
                    const op = ast.operator.slice(0, ast.operator.length - 1);
                    const operand = decompose(ast.right);
                    decomposed = ir.exprBinop(op as ir.BinaryOperator, decompose(ast.left), operand);
                }
            }
            if (t.isIdentifier(ast.left)) {
                const temp = block.addTemp(decomposed);
                updateLvalue(ctx, ast.left as t.LVal, temp);
                return ir.exprTemp(temp);
            } else if (t.isMemberExpression(ast.left) && (t.isIdentifier(ast.left.object))) {
                // this is a simple obj.prop = val set
                const target = decompose(ast.left.object);
                const prop = t.isIdentifier(ast.left.property) ? ir.exprLiteral(ast.left.property.name) : decompose(ast.left.property);
                block.set().object(target).propertyName(prop).expr(decomposed).finish();
                return decomposed;
            } else {
                const temp = block.addTemp(decomposed);
                return ir.exprTemp(temp);
            }
        }
        case 'Identifier': {
            const found = resolveLval(ctx, ast);
            return found.value || ir.exprIdentifier(found.lvalue);
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
            const temp = block.addTemp(ir.exprUnop(ast.operator, ast.prefix, decomposed));
            return ir.exprTemp(temp);
        }
        case 'UpdateExpression': {
            const updateOps: Record<string, ir.BinaryOperator> = {
                '++': '+',
                '--': '-',
            };
            if (ast.prefix) {
                // prefix: provide the original value, and also update it
                const decomposed = decompose(ast.argument);
                const temp = block.addTemp(ir.exprBinop(updateOps[ast.operator], decomposed, ir.exprLiteral(1)));
                updateLvalue(ctx, ast.argument as t.LVal, temp);
                return ir.exprTemp(temp);
            } else {
                // suffix: update the value and use that new identifier
                const decomposed = decompose(ast.argument);
                const temp = block.addTemp(ir.exprBinop(updateOps[ast.operator], decomposed, ir.exprLiteral(1)));
                updateLvalue(ctx, ast.argument as t.LVal, temp);
                return decomposed;
            }
        }
        case 'BinaryExpression':
        case 'LogicalExpression': {
            const decomposedLeft = decompose(ast.left),
                 decomposedRight = decompose(ast.right);
            const temp = block.addTemp(ir.exprBinop(ast.operator, decomposedLeft, decomposedRight));
            return ir.exprTemp(temp);
        }
        case 'CallExpression':
        case 'NewExpression': {
            const callee = decompose(ast.callee),
                args = ast.arguments.map(decompose);
            const temp = block.addTemp(ir.exprCall(callee, args, ast.type === 'NewExpression'));
            temp.effects.push(ir.effectIo());
            markStmtLive(temp);
            args.forEach((x) => markExprLive(block, x));
            return ir.exprTemp(temp);
        }
        case 'MemberExpression': {
            const expr = decompose(ast.object),
                prop = ast.computed ? decompose(ast.property) : ir.exprLiteral((ast.property as t.Identifier).name);
            const temp = block.addTemp(ir.exprProperty(expr, prop));
            return ir.exprTemp(temp);
        }
        case 'ArrayExpression': {
            const members = [];
            for (const value of ast.elements) {
                members.push({ key: undefined, value: decompose(value) });
            }
            const instance = block.addInstance(true, members);
            const id = instance.varId;
            return temp(id);
        }
        case 'ObjectExpression': {
            const members = [];
            for (const member of ast.properties) {
                switch (member.type) {
                    case 'ObjectMethod': {
                        // TODO
                        break;
                    }
                    case 'ObjectProperty': {
                        const key = member.key.type == 'Identifier' ? ir.exprLiteral(member.key.name) : decompose(member.key);
                        members.push({ key, value: decompose(member.value) });
                        break;
                    }
                    case 'SpreadElement': {
                        // TODO
                        break;
                    }
                }
            }
            const instance = block.addInstance(false, members);
            const id = instance.varId;
            return temp(id);
        }
        case 'FunctionExpression': {
            const def = new ir.FunctionDefinition(ctx.program);
            def.name = ast.id ? ast.id.name : undefined;
            compileStmt(ctx.childFunction(), def.body, ast.body);
            const temp = block.addTemp(ir.exprFunction(def));
            return ir.exprTemp(temp);
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
            const builder = block.if();
            builder.condition(condition);
            const phiVar = block.nextTemp();
            const bodyBlock = builder.body(),
                elseBlock = builder.else();
            const bodyVar = bodyBlock.nextTemp(),
                elseVar = elseBlock.nextTemp();
            bodyBlock.temp(builder.body().id, bodyVar).expr(bodyExpr).finish();
            elseBlock.temp(builder.else().id, elseVar).expr(elseExpr).finish();
            const stmt = builder.finish();
            markStmtLive(stmt);
            // FIXME: better way to split basic blocks? this phi goes in the next one
            block.temp(block.id, phiVar).expr(ir.exprPhi([ir.temp(bodyBlock.id, bodyVar), ir.temp(elseBlock.id, elseVar)])).finish();
            return ir.exprTemp2(block.id, phiVar);
        }
    }
    // we don't know what this is, so treat it as an opaque, effectful expression
    // TODO: warning
    return ir.exprRaw(ast);
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
                        case ir.IrStmtType.Return:
                        // case ir.IrStmtType.Throw:
                        {
                            break compileBlock;
                        }
                        case ir.IrStmtType.If:
                        case ir.IrStmtType.Loop: {
                            // FIXME: use a cursor with a reference to the block, do this automatically
                            const next = program.block();
                            block.nextBlock = next;
                            next.prevBlock = block;
                            next.available = block.available;
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
                        let tmp: ir.TempVar;
                        if (decomposed.kind === ir.IrExprType.Temp) {
                            tmp = ir.temp(block.id, decomposed.varId);
                        } else {
                            tmp = block.addTemp(decomposed);
                        }
                        const scope = ast.kind === 'var' ? ctx.functionScope : ctx;
                        scope.setBinding(decl.id.name, tmp);
                        // FIXME: addDeclaration should take a real TempVar, not a number
                        block.addDeclaration(scope.id, decl.id.name, tmp.varId);
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
            const builder = block.if();
            builder.condition(condition);
            compileStmt(ctx.childBlockScope(), builder.body(), ast.consequent);
            if (ast.alternate) {
                compileStmt(ctx.childBlockScope(), builder.else(), ast.alternate);
            }
            const stmt = builder.finish();
            markStmtLive(stmt);
            break;
        }
        case 'ForStatement': {
            if (ast.init) {
                recurse(ast.init);
            }
            const condition = ast.test ? decompose(ast.test) : ir.exprLiteral(true);
            const builder = block.while();
            builder.expr(condition);
            const body = builder.body();
            compileStmt(ctx.childBlockScope(), body, ast.body);
            if (ast.update) {
                compileStmt(ctx, body, ast.update);
            }
            const stmt = builder.finish();
            markStmtLive(stmt);
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
            const builder = ast.type === 'DoWhileStatement' ? block.doWhile() : block.while();
            builder.expr(condition);
            compileStmt(ctx.childBlockScope(), builder.body(), ast.body);
            const stmt = builder.finish();
            markStmtLive(stmt);
            break;
        }
        case 'BreakStatement': {
            const stmt = block.break();
            markStmtLive(stmt);
            break;
        }
        case 'ContinueStatement': {
            const stmt = block.continue();
            markStmtLive(stmt);
            break;
        }
        case 'ReturnStatement': {
            const returnValue = ast.argument ? decompose(ast.argument) : ir.exprLiteral(undefined);
            const stmt = block.return(returnValue);
            markStmtLive(stmt);
            break;
        }
        case 'FunctionDeclaration': {
            // FIXME: make a temp for the function
            // FIXME: initial pass to find function scoped variables and functions
            const def = new ir.FunctionDefinition(ctx.program);
            def.name = ast.id.name;
            const stmt = block.function(def);
            compileStmt(ctx.childFunction(), def.body, ast.body);
            program.functions.push(def.body);
            if (!ctx.functionScope.parent) {
                // keep top level function declarations
                markStmtLive(stmt);
            }
            break;
        }
        case 'ExpressionStatement': {
            recurse(ast.expression);
            break;
        }
        default: {
            const decomposed = decompose(ast);
            if (decomposed.kind !== ir.IrExprType.Temp) {
                block.addTemp(decomposed);
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
    program.functions.push(block);
    // TODO: we need an initial pass to find `var` and function declarations...
    // the initial pass should attach persistent scopes to the AST statements,
    // which also need to be attached to the blocks themselves
    for (const ast of body) {
        compileStmt(ctx, block, ast);
    }
    return program;
}
