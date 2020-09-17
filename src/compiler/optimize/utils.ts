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

export function simplifyTrivialExpr(block: ir.IrBlock, expr: ir.IrTrivialExpr): ir.IrTrivialExpr {
    switch (expr.kind) {
        case ir.IrExprType.Temp: {
            const definingBlock = block.program.getBlock(expr.blockId);
            const meta = definingBlock.getTempMetadata(expr.varId);
            if (meta && meta.definition) {
                const simplified = simplifyExpr(definingBlock, meta.definition);
                meta.definition = simplified;
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
            if (meta && meta.definition) {
                return simplifyExpr(definingBlock, meta.definition);
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

export class ReferenceMap {
    refs: Record<number, Record<number, ir.IrStmt[]>>;

    constructor() {
        this.refs = {};
    }

    addReference(blockId: number, varId: number, stmt: ir.IrStmt) {
        if (!this.refs[blockId]) {
            this.refs[blockId] = {};
        }
        if (!this.refs[blockId][varId]) {
            this.refs[blockId][varId] = [];
        }
        this.refs[blockId][varId].push(stmt);
    }

    getReferences(blockId: number, varId: number): ir.IrStmt[] {
        if (this.refs[blockId]) {
            return this.refs[blockId][varId] || [];
        }
        return [];
    }
}

export function applyToNextBlocks(f: (block: ir.IrBlock) => void, block: ir.IrBlock) {
    const lastStmt = block.body[block.body.length - 1];
    if (lastStmt) {
        switch (lastStmt.kind) {
            case ir.IrStmtType.If: {
                f(lastStmt.body);
                applyToNextBlocks(f, lastStmt.body);
                if (lastStmt.elseBody) {
                    f(lastStmt.elseBody);
                    applyToNextBlocks(f, lastStmt.elseBody);
                }
                break;
            }
            case ir.IrStmtType.Loop: {
                f(lastStmt.body);
                applyToNextBlocks(f, lastStmt.body);
                break;
            }
        }
    }
    if (block.nextBlock) {
        f(block.nextBlock);
    }
}

export function findReferences(block: ir.IrBlock, refs?: ReferenceMap): ReferenceMap {
    if (!refs) {
        refs = new ReferenceMap();
    }
    
    for (const stmt of block.body) {
        ir.applyToExprsInStmt((expr) => {
            switch (expr.kind) {
                case ir.IrExprType.Temp: {
                    refs.addReference(expr.blockId, expr.varId, stmt);
                    break;
                }
            }
        }, stmt);
    }
    applyToNextBlocks((next) => findReferences(next, refs), block);
    return refs;
}