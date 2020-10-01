import * as ir from '../../ir';
import { Ast, AstFile } from '../../ast';
import { IrScope, AnnotatedNode } from './scope';
import * as t from '@babel/types';
import { irPreProcess } from './preProcess';
import { BlockBuilder } from './builder';
import * as log from '../../log';

interface IrCompileContext {
    program: ir.IrProgram,
    irFunction: ir.IrFunction,
    scope: IrScope,
    builder: BlockBuilder,
}

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
function decomposeExpr(ctx: IrCompileContext, ast: Ast): ir.IrTrivialExpr {
    const { program, builder, scope } = ctx;
    function decompose(x: Ast) {
        return decomposeExpr(ctx, x);
    }
    function temp(id: number) {
        return ir.exprTemp2(builder.cursor.id, id);
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
                const temp = builder.addTemp(decomposed);
                temp.originalName = ast.left.name;
                updateLvalue(scope, ast.left as t.LVal, temp);
                return ir.exprTemp(temp);
            } else if (t.isMemberExpression(ast.left)) {
                const target = decompose(ast.left.object);
                const prop = t.isIdentifier(ast.left.property) ? ir.exprLiteral(ast.left.property.name) : decompose(ast.left.property);
                const newTemp = builder.addTemp(ir.exprSet(target, prop, decomposed));
                if (target.kind === ir.IrExprType.Temp) {
                    const currentMeta = program.getTemp(target.blockId, target.varId);
                    builder.newGeneration(newTemp, currentMeta);
                }
                return ir.exprTemp(newTemp);
            } else {
                throw new Error("TODO");
            }
        }
        case 'Identifier': {
            if (ast.name === 'undefined') {
                return ir.exprLiteral(undefined);
            }
            const found = resolveLval(scope, ast);
            if (found && found.value) {
                let temp = program.getTemp(found.value.blockId, found.value.varId);
                let next;
                while (next = builder.cursor.next[ir.tempToString(temp)]) {
                    temp = next;
                }
                return ir.exprTemp2(temp.blockId, temp.varId);
            }
            return ir.exprIdentifier(found.lvalue);
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
            const temp = builder.addTemp(ir.exprUnop(ast.operator, ast.prefix, decomposed));
            return ir.exprTemp(temp);
        }
        case 'UpdateExpression': {
            const op = ast.operator.substr(0, 1) as ir.BinaryOperator;
            if (ast.prefix) {
                // prefix: provide the original value, and also update it
                const decomposed = decompose(ast.argument);
                const temp = builder.addTemp(ir.exprBinop(op, decomposed, ir.exprLiteral(1)));
                updateLvalue(scope, ast.argument as t.LVal, temp);
                return ir.exprTemp(temp);
            } else {
                // suffix: update the value and use that new identifier
                const decomposed = decompose(ast.argument);
                const temp = builder.addTemp(ir.exprBinop(op, decomposed, ir.exprLiteral(1)));
                updateLvalue(scope, ast.argument as t.LVal, temp);
                return decomposed;
            }
        }
        case 'BinaryExpression':
        case 'LogicalExpression': {
            const decomposedLeft = decompose(ast.left),
                 decomposedRight = decompose(ast.right);
            const temp = builder.addTemp(ir.exprBinop(ast.operator, decomposedLeft, decomposedRight));
            return ir.exprTemp(temp);
        }
        case 'CallExpression':
        case 'NewExpression': {
            const callee = decompose(ast.callee),
                args = ast.arguments.map(decompose);
            const temp = builder.addTemp(ir.exprCall(callee, args, ast.type === 'NewExpression'));
            temp.effects.push(undefined);
            return ir.exprTemp(temp);
        }
        case 'MemberExpression': {
            const expr = decompose(ast.object),
                prop = ast.computed ? decompose(ast.property) : ir.exprLiteral((ast.property as t.Identifier).name);
            const temp = builder.addTemp(ir.exprProperty(expr, prop));
            return ir.exprTemp(temp);
        }
        case 'ArrayExpression': {
            let values = [];
            for (const value of ast.elements) {
                if (value !== null) {
                    values.push(decompose(value));
                }
            }
            const temp = builder.addTemp(ir.exprNewArray(values));
            return ir.exprTemp(temp);
        }
        case 'ObjectExpression': {
            let members = [];
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
            const temp = builder.addTemp(ir.exprNewObject(members));
            return ir.exprTemp(temp);
        }
        case 'FunctionExpression': {
            const temp = builder.addTemp(ir.exprFunction((ast as AnnotatedNode).irFunction));
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
            // FIXME
            throw new Error("ternary is not yet supported");
            // const condition = decompose(ast.test);
            // const bodyExpr = decompose(ast.consequent);
            // const elseExpr = decompose(ast.alternate);
            // const ifBuilder = builder.if();
            // ifBuilder.condition(condition);
            // const phiVar = builder.nextTemp();
            // const bodyBlock = builder.body(),
            //     elseBlock = builder.else();
            // const bodyVar = bodyBlock.nextTemp(),
            //     elseVar = elseBlock.nextTemp();
            // bodyBlock.temp(bodyVar).expr(bodyExpr).finish();
            // elseBlock.temp(elseVar).expr(elseExpr).finish();
            // const stmt = builder.finish();
            // markStmtLive(stmt);
            // // FIXME: better way to split basic blocks? this phi goes in the next one
            // block.temp(phiVar).expr(ir.exprPhi([ir.temp(bodyBlock.id, bodyVar), ir.temp(elseBlock.id, elseVar)])).finish();
            // return ir.exprTemp2(block.id, phiVar);
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
function compileStmt(ctx: IrCompileContext, ast: Ast) {
    const { program, scope, builder } = ctx;
    function recurse(x: Ast) {
        return compileStmt(ctx, x);
    }
    function decompose(x: Ast) {
        return decomposeExpr(ctx, x);
    }
    if (ast === null) {
        throw new Error("attempting to compile null AST");
    }
    switch (ast.type) {
        case 'BlockStatement': {
            const newScope = scope.childBlockScope();
            compileChild:
            for (const stmt of ast.body) {
                compileStmt({ ...ctx, scope: newScope }, stmt);
                switch (stmt.type) {
                    case 'BreakStatement':
                    case 'ContinueStatement':
                    case 'ReturnStatement':
                    case 'ThrowStatement': {
                        // any statements following one of these in a block are dead
                        break compileChild;
                    }
                }
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
                            tmp = ir.temp(decomposed.blockId, decomposed.varId);
                            program.getTempDefinition(decomposed.blockId, decomposed.varId).originalName = decl.id.name;
                        } else {
                            tmp = builder.addTemp(decomposed);
                            (tmp as ir.IrTempStmt).originalName = decl.id.name;
                        }
                        const boundScope = ast.kind === 'var' ? scope.functionScope : scope;
                        boundScope.setBinding(decl.id.name, tmp);
                        // FIXME: addDeclaration should take a real TempVar, not a number
                        builder.cursor.addDeclaration(scope.id, decl.id.name, tmp.varId);
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
            // TODO: this is a branch, so there's a chance to introduce phi here
            const condition = decompose(ast.test);
            const ifBuilder = builder.if();
            ifBuilder.condition(condition);
            compileStmt({ ...ctx, scope: scope.childBlockScope(), builder: ifBuilder.body() }, ast.consequent);
            if (ast.alternate) {
                compileStmt({ ...ctx, scope: scope.childBlockScope(), builder: ifBuilder.else() }, ast.alternate);
            }
            const stmt = ifBuilder.finish();
            break;
        }
        case 'ForStatement': {
            if (ast.init) {
                recurse(ast.init);
            }
            const condition = ast.test ? decompose(ast.test) : ir.exprLiteral(true);
            const loopBuilder = builder.while();
            loopBuilder.expr(condition);
            const body = loopBuilder.body();
            compileStmt({ ...ctx, scope: scope.childBlockScope(), builder: body }, ast.body);
            if (ast.update) {
                compileStmt({ ...ctx, builder: body }, ast.update);
            }
            const stmt = loopBuilder.finish();
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
            const loopBuilder = ast.type === 'DoWhileStatement' ? builder.doWhile() : builder.while();
            loopBuilder.expr(condition);
            compileStmt({ ...ctx, scope: scope.childBlockScope(), builder: loopBuilder.body() }, ast.body);
            const stmt = loopBuilder.finish();
            break;
        }
        case 'BreakStatement': {
            if (ast.label !== null) {
                throw new Error("labeled break is not supported");
            }
            const stmt = builder.break();
            break;
        }
        case 'ContinueStatement': {
            if (ast.label !== null) {
                throw new Error("labeled continue is not supported");
            }
            const stmt = builder.continue();
            break;
        }
        case 'ReturnStatement': {
            const returnValue = ast.argument ? decompose(ast.argument) : ir.exprLiteral(undefined);
            const stmt = builder.return(returnValue);
            break;
        }
        case 'FunctionDeclaration': {
            // noop; the temp was created during preprocessing, and the function will be compiled later
            break;
        }
        case 'ExpressionStatement': {
            recurse(ast.expression);
            break;
        }
        default: {
            const decomposed = decompose(ast);
            if (decomposed.kind !== ir.IrExprType.Temp) {
                builder.addTemp(decomposed);
            }
        }
    }
}

function compileFunction(program: ir.IrProgram, ast: AnnotatedNode) {
    const { irFunction, scope, builder } = ast;
    log.logDebug(`compiling function ${irFunction.name}`);
    const ctx = { program, irFunction, scope, builder };
    let stmts;
    switch (ast.type) {
        case 'Program': {
            stmts = ast.body;
            break;
        }
        case 'FunctionDeclaration':
        case 'FunctionExpression': {
            stmts = ast.body.body;
            break;
        }
        default: {
            throw new Error(`unexpected function node: ${ast.type}`);
        }
    }
    for (const stmt of stmts) {
        compileStmt(ctx, stmt);
    }
}

/**
 * Generate a WWIR program block from a Babel AST node.
 */
export function irCompile(ast: AstFile): ir.IrProgram {
    const program = irPreProcess(ast);
    for (const f of program.functions) {
        compileFunction(program, f.ast);
    }
    return program;
}
