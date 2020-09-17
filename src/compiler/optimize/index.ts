import * as ir from '../../ir';
import * as cullDeadStmts from './cullDeadStmts';
import * as simplify from './simplify';
import * as commonSubExpressions from './commonSubExpressions';
import * as branchElimination from './branchElimination';
import * as inlineInstances from './inlineInstances';
import * as inlineTemps from './inlineTemps';

const baseOptimizations: Optimization[] = [
    cullDeadStmts,
    simplify,
    commonSubExpressions,
    branchElimination,
    inlineInstances,
    inlineTemps,
]

/**
 * Optimization passes can be objects but are generally modules; if they export
 * any of these traversal methods, they'll automatically be called across the
 * program being optimized.
 */
interface OptimizationMethods {
    optimizeProgram: (program: ir.IrProgram) => void,
    optimizeBlock: (block: ir.IrBlock) => void,
    optimizeStmt: (block: ir.IrBlock, stmt: ir.IrStmt) => void,
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
