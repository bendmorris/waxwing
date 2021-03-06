import * as ir from '../ir';

const staticBinops = {
    '*': (a, b) => a * b,
    '/': (a, b) => a / b,
    '%': (a, b) => a % b,
    '**': (a, b) => a ** b,
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '<<': (a, b) => a << b,
    '>>': (a, b) => a >> b,
    '>>>': (a, b) => a >>> b,
    '<': (a, b) => a < b,
    '>': (a, b) => a > b,
    '<=': (a, b) => a <= b,
    '>=': (a, b) => a >= b,
    '==': (a, b) => a == b,
    '!=': (a, b) => a != b,
    '===': (a, b) => a === b,
    '!==': (a, b) => a !== b,
    '&': (a, b) => a & b,
    '^': (a, b) => a ^ b,
    '|': (a, b) => a | b,
    '&&': (a, b) => a && b,
    '||': (a, b) => a || b,
    '??': (a, b) => a ?? b,
};

const staticUnops = {
    '+': (a) => +a,
    '-': (a) => -a,
    'void': () => undefined,
}

export function simplifyTrivialExpr(block: ir.IrBlock, expr: ir.IrTrivialExpr): ir.IrTrivialExpr {
    switch (expr.kind) {
        case ir.IrExprType.Temp: {
            const definingBlock = block.program.getBlock(expr.blockId);
            const meta = definingBlock.getTempDefinition(expr.varId);
            if (meta && meta.kind === ir.IrStmtType.Temp && meta.expr) {
                const simplified = simplifyExpr(definingBlock, meta.expr);
                meta.expr = simplified;
                return ir.isTrivial(simplified) ? (simplified as ir.IrTrivialExpr) : expr;
            }
            return expr;
        }
        default: {
            if (ir.isTrivial(expr)) {
                return expr as ir.IrTrivialExpr;
            }
        }
    }
    return expr;
}

/**
 * Statically evaluate the given expression as far as possible.
 */
export function simplifyExpr(block: ir.IrBlock, expr: ir.IrExpr): ir.IrExpr {
    switch (expr.kind) {
        case ir.IrExprType.Temp: {
            const definingBlock = block.program.getBlock(expr.blockId);
            const meta = definingBlock.getTempMetadata(expr.varId);
            if (meta && meta.kind === ir.IrStmtType.Temp && meta.expr) {
                return simplifyExpr(definingBlock, meta.expr);
            }
            return expr;
        }
        case ir.IrExprType.Binop: {
            const lhs = simplifyTrivialExpr(block, expr.left),
                rhs = simplifyTrivialExpr(block, expr.right);
            if (lhs && rhs &&
                lhs.kind === ir.IrExprType.Literal &&
                rhs.kind === ir.IrExprType.Literal &&
                staticBinops[expr.operator]
            ) {
                return ir.exprLiteral(staticBinops[expr.operator](lhs.value, rhs.value));
            }
            return ir.exprBinop(expr.operator, lhs, rhs);
        }
        case ir.IrExprType.Unop: {
            const operand = simplifyTrivialExpr(block, expr.expr);
            if (operand.kind === ir.IrExprType.Literal &&
                staticUnops[expr.operator]
            ) {
                return ir.exprLiteral(staticUnops[expr.operator](operand.value));
            }
            return ir.exprUnop(expr.operator, expr.prefix, operand);
        }
        case ir.IrExprType.Property: {
            if (expr.expr.kind === ir.IrExprType.Temp) {
                // see if we know this property value
            }
            break;
        }
        default: {
            if (ir.isTrivial(expr)) {
                return simplifyTrivialExpr(block, expr as ir.IrTrivialExpr);
            }
        }
    }
    return expr;
}

export function getNextBlocks(block: ir.IrBlock): ir.IrBlock[] {
    const result = [];
    const lastStmt = block.body[block.body.length - 1];
    if (lastStmt) {
        switch (lastStmt.kind) {
            case ir.IrStmtType.If: {
                result.push(lastStmt.body);
                if (lastStmt.elseBody) {
                    result.push(lastStmt.elseBody);
                }
                if (lastStmt.then) {
                    result.push(lastStmt.then);
                }
                break;
            }
            case ir.IrStmtType.Loop: {
                result.push(lastStmt.body);
                if (lastStmt.then) {
                    result.push(lastStmt.then);
                }
                break;
            }
            case ir.IrStmtType.Goto: {
                result.push(lastStmt.dest);
                if (lastStmt.then) {
                    result.push(lastStmt.then);
                }
                break;
            }
        }
    }
    return result;
}


export function applyToNextBlocks(f: (block: ir.IrBlock) => void, block: ir.IrBlock) {
    for (const next of getNextBlocks(block)) {
        f(next);
    }
}
