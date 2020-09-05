import * as ir from '../../ir';
import * as findEffects from './findEffects';

interface OptimizationMethods {
    optimizeProgram: (program: ir.IrProgram) => void,
    optimizeBlock: (block: ir.IrBlock) => void,
    optimizeStmt: (block: ir.IrBlock, stmt: ir.StmtWithMeta) => void,
}

export type Optimization = Partial<OptimizationMethods>;

export function applyOptimization(opt: Optimization, program: ir.IrProgram) {
    if (opt.optimizeProgram) {
        opt.optimizeProgram(program);
    }

    if (opt.optimizeBlock || opt.optimizeStmt) {
        for (const block of program.blocks) {
            if (opt.optimizeBlock) {
                opt.optimizeBlock(block);
            }
            if (opt.optimizeStmt) {
                for (const stmt of block.body) {
                    opt.optimizeStmt(block, stmt);
                }
            }
        }
    }
}

export function optimizeProgram(program: ir.IrProgram) {
    applyOptimization(findEffects, program);
}
