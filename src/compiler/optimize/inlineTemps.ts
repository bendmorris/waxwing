import * as ir from '../../ir';
import * as u from '../utils';
import { findReferences, ReferenceMap } from './references';

function optimizeBlock(block: ir.IrBlock, refs: ReferenceMap) {
    for (const temp of Object.values(block.temps)) {
        if (temp.kind !== ir.IrStmtType.Temp) {
            continue;
        }
        const meta = block.getTempDefinition(temp.varId);
        const references = refs.getReferences(meta.blockId, meta.varId);
        if (references.length < 2) {
            // FIXME: be smarter about illegal relocations
            meta.requiresRegister = false;
            meta.inlined = !!references.length;
        } else {
            const originalDef = meta.expr;
            if (originalDef) {
                const def = u.simplifyExpr(block, originalDef) || originalDef;
                switch (def.kind) {
                    case ir.IrExprType.Literal: {
                        if (typeof(def.value) === 'string' || typeof(def.value) === 'number') {
                            const valLen = JSON.stringify(def.value).length;
                            const registerCost = 'var x='.length + (valLen * references.length);
                            const inlineCost = valLen * references.length;
                            meta.requiresRegister = registerCost < inlineCost;
                        } else {
                            // other types: inline
                            meta.requiresRegister = false;
                        }
                        meta.inlined = !meta.requiresRegister;
                    }
                }
            }
        }
    }
    u.applyToNextBlocks((b) => optimizeBlock(b, refs), block);
}

// TODO: replace `simplfyExpr` use with constraint solver
export function optimizeFunction(irFunction: ir.IrFunction) {
    const refs = findReferences(irFunction.blocks[0]);
    optimizeBlock(irFunction.body, refs);
}
