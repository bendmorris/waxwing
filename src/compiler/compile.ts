import * as ir from '../ir';
import { Ast } from '../ast';
import { IrExprType } from '../ir';

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
function decomposeToTrivial(ctx: CompileContext, block: ir.IrBlock, ast: Ast): ir.TrivialExpr {
    function decompose(x: Ast) {
        return decomposeToTrivial(ctx, block, x);
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
 * `decomposeToTrivial`.
 */
function compileExpr(ctx: CompileContext, block: ir.IrBlock, ast: Ast) {
    function recurse(x: Ast) {
        compileExpr(ctx, block, x);
    }
    function decompose(x: Ast) {
        return decomposeToTrivial(ctx, block, x);
    }
    switch (ast.type) {
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
            block.loop();
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
            block.loop(ast.type === 'DoWhileStatement');
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
export function irCompile(ast: Ast): ir.IrBlock {
    const ctx = new CompileContext();
    const block = new ir.IrBlock();
    compileExpr(ctx, block, ast);
    return block;
}
