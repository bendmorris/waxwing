import * as ir from '../../ir';
import * as cullDeadStmts from './cullDeadStmts';
import * as simplify from './simplify';
import * as branchElimination from './branchElimination';
import * as inlineTemps from './inlineTemps';

const baseOptimizations: Optimization[] = [
    cullDeadStmts,
    simplify,
    branchElimination,
    inlineTemps,
]

interface OptimizationMethods {
    optimizeProgram: (program: ir.IrProgram) => void,
    optimizeBlock: (block: ir.IrBlock) => void,
    optimizeStmt: (block: ir.IrBlock, stmt: ir.StmtWithMeta) => void,
    optimizeFunction: (firstBlock: ir.IrBlock) => void,
}

export type Optimization = Partial<OptimizationMethods>;

export function applyOptimization(opt: Optimization, program: ir.IrProgram) {
    if (opt.optimizeProgram) {
        opt.optimizeProgram(program);
    }

    if (opt.optimizeFunction) {
        for (const firstBlock of program.functions) {
            opt.optimizeFunction(firstBlock);
        }
    }

    if (opt.optimizeBlock || opt.optimizeStmt) {
        for (let block of program.blocks) {
            while (block) {
                if (!block.live) {
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
                block = block.nextBlock;
            }
        }
    }
}

export function optimizeProgram(program: ir.IrProgram) {
    for (const opt of baseOptimizations) {
        applyOptimization(opt, program);
    }
}
