import * as ir from '../ir';
import { applyToNextBlocks } from './utils';

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
