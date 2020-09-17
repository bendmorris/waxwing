


import * as ir from '../../ir';
import { exprProperty } from '../../ir';
import * as u from './utils';

type InstanceAssignment = ir.IrTempStmt & ir.IrStmtMetadata & { expr: ir.IrNewInstanceExpr };

export class InstanceMap {
    refs: Record<number, Record<number, InstanceAssignment>>;

    constructor() {
        this.refs = {};
    }

    addInstance(blockId: number, varId: number, stmt: InstanceAssignment) {
        if (!this.refs[blockId]) {
            this.refs[blockId] = {};
        }
        this.refs[blockId][varId] = stmt;
    }

    getInstance(blockId: number, varId: number): InstanceAssignment | undefined {
        if (this.refs[blockId]) {
            return this.refs[blockId][varId];
        }
        return undefined;
    }

    copy() {
        const copy = new InstanceMap();
        copy.refs = {...this.refs};
        return copy;
    }
}


function optimizeBlock(block: ir.IrBlock, instances: InstanceMap) {
    const program = block.program;
    let i = 0;
    while (i < block.body.length) {
        const stmt = block.body[i];
        switch (stmt.kind) {
            case ir.IrStmtType.Temp: {
                const expr = stmt.expr;
                switch (expr.kind) {
                    case ir.IrExprType.NewInstance: {
                        instances[expr.instanceId] = stmt as InstanceAssignment;
                        break;
                    }
                    case ir.IrExprType.Set: {
                        const target = expr.expr;
                        if (target.kind === ir.IrExprType.Temp) {
                            const block = program.getBlock(target.blockId);
                            const instance = instances.getInstance(target.blockId, target.varId);
                            if (instance !== undefined) {
                                const meta = block.instances[instance.expr.instanceId];
                                if (meta.canRelocate) {
                                    // if this instance can still relocate, we can safely add this set to the declaration
                                    meta.constructorExpr.definition.push({
                                        key: expr.property,
                                        value: expr.value,
                                    });
                                    block.body.splice(i--, 1);
                                }
                            }
                        }
                        break;
                    }
                }
                break;
            }
        }
        ++i;
    }
    u.applyToNextBlocks((b) => optimizeBlock(b, instances.copy()), block);
}

// TODO: replace `simplfyExpr` use with constraint solver
export function optimizeFunction(firstBlock: ir.IrBlock) {
    optimizeBlock(firstBlock, new InstanceMap());
}
