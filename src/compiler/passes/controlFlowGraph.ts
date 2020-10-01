import * as ir from '../../ir';

export interface CfgContext {
    program: ir.IrProgram,
    continueDestination?: ir.IrBlock,
    breakDestination?: ir.IrBlock,
}

function addChild(parent: ir.IrBlock, child: ir.IrBlock) {
    if (child) {
        parent.children.push(child);
        child.parents.push(parent);
    }
}

/**
 * Build a control flow graph starting from this block.
 *
 * This function returns a generator of terminal nodes; iterating over it will
 * construct the control flow graph.
 */
function *constructCfg(cfgContext: CfgContext, block: ir.IrBlock) {
    const last = block.lastStmt;
    if (!last) {
        return;
    }
    switch (last.kind) {
        case ir.IrStmtType.If: {
            addChild(block, last.body);
            for (const terminal of constructCfg(cfgContext, last.body)) {
                if (last.then) {
                    addChild(terminal, last.then);
                } else {
                    yield terminal;
                }
            }
            if (last.elseBody) {
                for (const terminal of constructCfg(cfgContext, last.elseBody)) {
                    if (last.then) {
                        addChild(terminal, last.then);
                    } else {
                        yield terminal;
                    }
                }
            } else {
                addChild(block, last.then);
            }
            if (last.then) {
                yield *constructCfg(cfgContext, last.then);
            }
            break;
        }
        case ir.IrStmtType.Goto: {
            addChild(block, last.dest);
            const children = constructCfg(cfgContext, last.dest);
            if (last.then) {
                for (const child of children) {
                    addChild(child, last.then);
                }
                yield *constructCfg(cfgContext, last.then);
            } else {
                yield *children;
            }
            break;
        }
        case ir.IrStmtType.Loop: {
            if (last.loopType !== ir.LoopType.DoWhile) {
                // we may not enter the loop body
                addChild(block, last.then);
            }
            addChild(block, last.body);
            const newCtx = { ...cfgContext, continueTarget: last.body, breakTarget: last.then };
            const children = constructCfg(newCtx, last.body);
            if (last.then) {
                for (const child of children) {
                    addChild(child, last.body);
                    addChild(child, last.then);
                }
                yield *constructCfg(cfgContext, last.then);
            } else {
                for (const child of children) {
                    addChild(child, last.body);
                    yield child;
                }
            }
            break;
        }
        default: {
            // this must be a terminal block
            yield block;
        }
    }
}

export function visitFunction(program: ir.IrProgram, f: ir.IrFunction) {
    // this is a generator; exhaust it to build the CFG
    for (const _ of constructCfg({ program }, f.body)) {}
}
