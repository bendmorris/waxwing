import * as ir from '../../ir';
import * as simplify from './simplify';
import * as branchElimination from './branchElimination';
import * as commonSubExpressions from './commonSubExpressions';
import * as controlFlowGraph from './controlFlowGraph';
import * as inlineInstances from './inlineInstances';
import * as inlineTemps from './inlineTemps';
import * as liveness from './liveness';
import * as log from '../../log';

const basePasses: Record<string, CompilePass> = {
    liveness,
    simplify,
    branchElimination,
    controlFlowGraph,
    commonSubExpressions,
    inlineInstances,
    inlineTemps,
};

/**
 * Compiler passes can be objects but are generally modules; if they export
 * any of these traversal methods, they'll automatically be called across the
 * program being optimized.
 */
interface CompilePassVisitors {
    visitProgram: (program: ir.IrProgram) => void,
    visitBlock: (program: ir.IrProgram, block: ir.IrBlock) => void,
    visitStatement: (program: ir.IrProgram, block: ir.IrBlock, stmt: ir.IrStmt) => void,
    visitFunction: (program: ir.IrProgram, irFunction: ir.IrFunction) => void,
}

export type CompilePass = Partial<CompilePassVisitors>;

export function applyPass(name: string, opt: CompilePass, program: ir.IrProgram) {
    if (opt.visitBlock || opt.visitStatement) {
        for (let block of program.blocks) {
            if (!block.live) {
                continue;
            }
            if (opt.visitStatement) {
                for (const stmt of block.body) {
                    opt.visitStatement(program, block, stmt);
                }
            }
            if (opt.visitBlock) {
                opt.visitBlock(program, block);
            }
        }
    }
    if (opt.visitFunction) {
        for (const irFunction of program.functions) {
            opt.visitFunction(program, irFunction);
        }
    }
    if (opt.visitProgram) {
        opt.visitProgram(program);
    }

    log.logDebug(`optimization pass: ${name}`, () => program.toString());
}

export function visitProgram(program: ir.IrProgram) {
    for (const key in basePasses) {
        applyPass(key, basePasses[key], program);
    }
}
