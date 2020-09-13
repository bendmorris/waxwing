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

const staticUnops = {
    '+': (a) => +a,
    '-': (a) => -a,
    'void': () => undefined,
}

/**
 * Statically evaluate the given expression as far as possible.
 */
export function simplifyExpr(block: ir.IrBlock, expr: ir.IrExpr): (ir.IrTrivialExpr | undefined) {
    switch (expr.kind) {
        case ir.IrExprType.Temp: {
            const definingBlock = block.program.getBlock(expr.blockId);
            const meta = definingBlock.getTempMetadata(expr.varId);
            if (meta && meta.definition) {
                return simplifyExpr(definingBlock, meta.definition);
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
            break;
        }
        case ir.IrExprType.Unop: {
            const operand = simplifyExpr(block, expr.expr);
            if (operand &&
                operand.kind === ir.IrExprType.Literal &&
                staticUnops[expr.operator]
            ) {
                return ir.exprLiteral(staticUnops[expr.operator](operand.value));
            }
            break;
        }
        case ir.IrExprType.Property: {
            if (expr.expr.kind === ir.IrExprType.Temp) {
                // see if we know this property value
            }
            break;
        }
        default: {
            if (ir.isTrivial(expr)) {
                return expr as ir.IrTrivialExpr;
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
