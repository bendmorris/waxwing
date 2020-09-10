import * as ir from '../../ir';
import * as simplify from './simplify';
import * as branchElimination from './branchElimination';

const baseOptimizations: Optimization[] = [
    simplify,
    branchElimination,
]

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
        for (let block of program.blocks) {
            while (block) {
                if (block.dead) {
                    break;
                }
                if (opt.optimizeBlock) {
                    opt.optimizeBlock(block);
                }
                if (opt.optimizeStmt) {
                    for (const stmt of block.body) {
                        opt.optimizeStmt(block, stmt);
                    }
                }
                block = block.continued;
            }
        }
    }
}

export function optimizeProgram(program: ir.IrProgram) {
    for (const opt of baseOptimizations) {
        applyOptimization(opt, program);
    }
}
