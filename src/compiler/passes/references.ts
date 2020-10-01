import * as ir from '../../ir';
import { applyToNextBlocks } from '../utils';

export class ReferenceMap {
    program: ir.IrProgram;
    refs: Record<number, Record<number, ir.IrStmt[]>>;

    constructor(program: ir.IrProgram) {
        this.program = program;
        this.refs = {};
    }

    addReference(refBlockId: number, refVarId: number, stmt: ir.IrStmt) {
        const { blockId, varId } = this.program.getTempDefinition(refBlockId, refVarId);
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

export function findReferences(program: ir.IrProgram, block: ir.IrBlock, refs?: ReferenceMap): ReferenceMap {
    if (!refs) {
        refs = new ReferenceMap(program);
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
    applyToNextBlocks((next) => findReferences(program, next, refs), block);
    return refs;
}
