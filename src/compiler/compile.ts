import * as ir from '../ir';
import { Ast } from '../ast';
import { IrExprType, exprLiteral } from '../ir';
import { FunctionDefinition } from '../ir/function';

class CompileContext {
    private _nextLocal: number;

    constructor() {
        this._nextLocal = 0;
    }

    nextLocal(): number {
        return this._nextLocal++;
    }
}

/**
 * Break down an AST node, returning a TrivialExpr. If this requires
 * decomposing, additional assignments will be added to `block`.
 */
function decomposeExpr(ctx: CompileContext, block: ir.IrBlock, ast: Ast): ir.TrivialExpr {
    function decompose(x: Ast) {
        return decomposeExpr(ctx, block, x);
    }
    function decomposeCall(x: Ast): ir.TrivialExprNoCall {
        const decomposed = decompose(x);
        if (decomposed.kind === IrExprType.Call) {
            const id = ctx.nextLocal();
            block.assign().local(id).call(decomposed.callee, decomposed.args);
            return ir.exprIdentifierLocal(id);
        }
        return decomposed;
    }
    switch (ast.type) {
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
            const id = ctx.nextLocal();
            block.assign().local(id).unop(ast.operator, ast.prefix, decomposed);
            return ir.exprIdentifierLocal(id);
        }
        case 'UpdateExpression': {
            if (ast.prefix) {
                // prefix: provide the original value, and also update it
                // TODO
            } else {
                // suffix, update the value and use that new identifier
                // TODO
            }
            // FIXME
            return ir.exprRaw(ast);
        }
        case 'BinaryExpression':
        case 'LogicalExpression': {
            const decomposedLeft = decompose(ast.left),
                 decomposedRight = decompose(ast.right);
            const id = ctx.nextLocal();
            block.assign().local(id).binop(ast.operator, decomposedLeft, decomposedRight);
            return ir.exprIdentifierLocal(id);
        }
        case 'CallExpression':
        case 'NewExpression': {
            const callee = decomposeCall(ast.callee),
                args = ast.arguments.map(decomposeCall);
            return ir.exprCall(callee, args, ast.type === 'NewExpression');
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
function compileStmt(ctx: CompileContext, block: ir.IrBlock, ast: Ast) {
    function recurse(x: Ast) {
        compileStmt(ctx, block, x);
    }
    function decompose(x: Ast) {
        return decomposeExpr(ctx, block, x);
    }
    switch (ast.type) {
        case 'BlockStatement': {
            for (const stmt of ast.body) {
                recurse(stmt);
            }
            break;
        }
        case 'VariableDeclaration': {
            // TODO...
            break;
        }
        case 'IfStatement': {
            block.if();
            recurse(ast.test);
            block.start();
            recurse(ast.consequent);
            if (ast.alternate) {
                block.else();
                recurse(ast.alternate);
            }
            block.end();
            break;
        }
        case 'ForStatement': {
            recurse(ast.init);
            block.while();
            recurse(ast.test);
            block.start();
            recurse(ast.body);
            recurse(ast.update);
            block.end();
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
            if (ast.type === 'DoWhileStatement') {
                block.doWhile();
            } else {
                block.while();
            }
            recurse(ast.test);
            block.start();
            recurse(ast.body);
            block.end();
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
            block.return(ast.argument ? decompose(ast.argument) : exprLiteral(undefined));
            break;
        }
        case 'FunctionDeclaration': {
            const def = new FunctionDefinition();
            def.name = ast.id.name;
            block.function(def);
            compileStmt(ctx, def.body, ast.body);
            break;
        }
        default: {
            const id = ctx.nextLocal();
            const decomposed = decompose(ast);
            block.assign().local(id).expr(decomposed);
        }
    }
}

/**
 * Generate a WWIR program block from a Babel AST node.
 */
export function irCompile(body: Ast[]): ir.IrBlock {
    const ctx = new CompileContext();
    const block = new ir.IrBlock();
    for (const ast of body) {
        compileStmt(ctx, block, ast);
    }
    return block;
}
