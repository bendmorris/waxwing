import * as ir from '../../ir';

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

/**
 * Statically evaluate the given expression as far as possible.
 */
export function simplifyExpr(block: ir.IrBlock, expr: ir.Expr): (ir.TrivialExpr | undefined) {
    switch (expr.kind) {
        case ir.IrExprType.Identifier: {
            if (expr.lvalue.kind === ir.LvalueType.Temp) {
                const definingBlock = block.program.getBlock(expr.lvalue.blockId);
                const meta = definingBlock.getTempMetadata(expr.lvalue.varId);
                if (meta && meta.definition) {
                    return simplifyExpr(definingBlock, meta.definition);
                }
            }
            return expr;
        }
        case ir.IrExprType.Binop: {
            const lhs = simplifyExpr(block, expr.left),
                rhs = simplifyExpr(block, expr.right);
            if (lhs && rhs &&
                lhs.kind === ir.IrExprType.Literal &&
                rhs.kind === ir.IrExprType.Literal &&
                staticBinops[expr.operator]
            ) {
                return ir.exprLiteral(staticBinops[expr.operator](lhs.value, rhs.value));
            }
        }
        default: {
            if (ir.isTrivial(expr)) {
                return expr as ir.TrivialExpr;
            }
        }
    }
    return undefined;
}

export function optimizeStmt(block: ir.IrBlock, stmt: ir.StmtWithMeta) {
    switch (stmt.kind) {
        case ir.IrStmtType.Assignment:
        case ir.IrStmtType.ExprStmt:
        case ir.IrStmtType.Loop:
        case ir.IrStmtType.Return: {
            const simplified = simplifyExpr(block, stmt.expr);
            if (simplified) {
                // TODO: create a replace utility
                stmt.expr = simplified;
            }
            break;
        }
        case ir.IrStmtType.If: {
            const simplified = simplifyExpr(block, stmt.condition);
            if (simplified) {
                stmt.condition = simplified;
            }
            break;
        }
    }
}
