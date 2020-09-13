import * as ir from '../../ir';
import * as u from './utils';

function optimizeBlock(block: ir.IrBlock, refs: u.ReferenceMap) {
    for (const temp in block.temps) {
        const meta = block.temps[temp];
        const references = refs.getReferences(meta.blockId, meta.varId);
        if (references.length < 2) {
            // FIXME: be smarter about illegal relocations
            meta.requiresRegister = false;
            meta.inlined = !!references.length;
        } else {
            const def = meta.definition;
            if (def) {
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
export function optimizeFunction(firstBlock: ir.IrBlock) {
    const refs = u.findReferences(firstBlock);
    optimizeBlock(firstBlock, refs);
}
