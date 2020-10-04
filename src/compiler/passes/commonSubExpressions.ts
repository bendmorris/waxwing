import * as ir from '../../ir';
import * as log from '../../log';
import { BlockBuilder } from '../compile/builder';

type AnticipatedForBlock = Record<string, ir.IrExpr>;
type AnticipatedMap = Record<number, AnticipatedForBlock>;

function validExpressionForCse(expr: ir.IrExpr) {
    // FIXME: member access should only be valid here if the value doesn't escape and isn't called,
    // or is a symbolic value that doesn't care about `this`
    switch (expr.kind) {
        case ir.IrExprType.NewArray:
        case ir.IrExprType.NewObject: {
            return false;
        }
    }
    return true;
}

function findAnticipatedValues(program: ir.IrProgram, block: ir.IrBlock, map: AnticipatedMap): AnticipatedForBlock {
    if (!map[block.id]) {
        const m = map[block.id] = {};
        for (const stmt of block.body) {
            switch (stmt.kind) {
                case ir.IrStmtType.Temp: {
                    const expr = stmt.expr;
                    if (stmt.effects.length) {
                        continue;
                    }
                    if (validExpressionForCse(expr)) {
                        ir.canonicalizeExpr(expr);
                        const key = ir.exprToString(expr);
                        m[key] = expr;
                    }
                    break;
                }
            }
        }
        let childAnticipated: AnticipatedForBlock;
        for (const child of block.children) {
            if (!childAnticipated) {
                childAnticipated = findAnticipatedValues(program, child, map);
            } else {
                const newValues = findAnticipatedValues(program, child, map);
                for (const x in childAnticipated) {
                    if (!newValues[x]) {
                        delete childAnticipated[x];
                    }
                }
            }
        }
        if (childAnticipated) {
            for (const x in childAnticipated) {
                m[x] = childAnticipated[x];
            }
        }
    }
    return map[block.id];
}

function visitBlock(program: ir.IrProgram, block: ir.IrBlock, map: AnticipatedMap, available: Record<string, ir.TempVar>) {
    const anticipated = map[block.id];
    for (const temp in block.temps) {
        const def = block.temps[temp];
        if (def.kind === ir.IrStmtType.Temp) {
            const key = ir.exprToString(def.expr);
            if (!available[key]) {
                available[key] = def;
            }
        }
    }
    for (const x in anticipated) {
        if (!available[x]) {
            // push a new temp
            const temp = BlockBuilder.forBlock(block).prependTemp(anticipated[x]);
            available[x] = temp;
        }
    }
    for (const temp in block.temps) {
        const def = block.temps[temp];
        if (def.kind === ir.IrStmtType.Temp) {
            const existing = available[ir.exprToString(def.expr)];
            if (existing && !(existing.blockId === def.blockId && existing.varId === def.varId)) {
                def.expr = ir.exprTemp(existing);
            }
        }
    }
    for (const child of block.children) {
        visitBlock(program, child, map, { ...available });
    }
}

export function visitFunction(program: ir.IrProgram, irFunction: ir.IrFunction) {
    const map: AnticipatedMap = {};
    findAnticipatedValues(program, irFunction.body, map);
    log.logChatty('anticipated values', () => Object.keys(map).map((key) => `${key}: ${Object.keys(map[key]).join('; ')}`).join('\n'));
    const available = {};
    visitBlock(program, irFunction.body, map, available);
    log.logChatty('available values', () => Object.keys(available).map((key) => `${key}: ${ir.tempToString(available[key])}`).join('\n'));
}
