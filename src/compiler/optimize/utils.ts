import * as ir from '../../ir';
import { StmtWithMeta } from '../../ir';

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

export class ReferenceMap {
    refs: Record<number, Record<number, ir.StmtWithMeta[]>>;

    constructor() {
        this.refs = {};
    }

    addReference(blockId: number, varId: number, stmt: ir.StmtWithMeta) {
        if (!this.refs[blockId]) {
            this.refs[blockId] = {};
        }
        if (!this.refs[blockId][varId]) {
            this.refs[blockId][varId] = [];
        }
        this.refs[blockId][varId].push(stmt);
    }

    getReferences(blockId: number, varId: number): ir.StmtWithMeta[] {
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
                default: {}
            }
        }, stmt);
    }
    applyToNextBlocks((next) => findReferences(next, refs), block);
    return refs;
}
