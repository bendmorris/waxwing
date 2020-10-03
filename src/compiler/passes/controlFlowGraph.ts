import * as ir from '../../ir';
import * as log from '../../log';

export interface CfgContext {
    program: ir.IrProgram,
    continueTarget?: ir.IrBlock,
    breakTarget?: ir.IrBlock,
}

function addChild(parent: ir.IrBlock, child: ir.IrBlock, weak?: boolean) {
    if (child) {
        (weak ? parent.weakChildren : parent.children).push(child);
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
            // if may proceed to the body
            addChild(block, last.body);
            for (const terminal of constructCfg(cfgContext, last.body)) {
                if (last.then) {
                    addChild(terminal, last.then);
                } else {
                    yield terminal;
                }
            }
            // if there's an else, we may proceed there;
            // otherwise we may proceed to then or exit
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
                if (!last.then) {
                    yield block;
                }
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
                // we may skip the loop body
                addChild(block, last.then);
            }
            addChild(block, last.body);
            const newCtx = { ...cfgContext, continueTarget: last.body, breakTarget: last.then };
            const children = constructCfg(newCtx, last.body);
            if (last.then) {
                for (const child of children) {
                    addChild(child, last.body, true);
                    addChild(child, last.then);
                }
                yield *constructCfg(cfgContext, last.then);
            } else {
                for (const child of children) {
                    addChild(child, last.body, true);
                    yield child;
                }
            }
            break;
        }
        default: {
            switch (last.kind) {
                case ir.IrStmtType.Return: {
                    // noop
                    break;
                }
                case ir.IrStmtType.Break: {
                    addChild(block, cfgContext.breakTarget);
                    break;
                }
                case ir.IrStmtType.Continue: {
                    addChild(block, cfgContext.continueTarget, true);
                    break;
                }
                default: {
                    // this must be a terminal block
                    yield block;
                }
            }
        }
    }
}

export function visitFunction(program: ir.IrProgram, f: ir.IrFunction) {
    // this is a generator; exhaust it to build the CFG
    const ctx: CfgContext = { program };
    for (const block of constructCfg(ctx, f.body)) {
        f.terminalBlocks.add(block);
    }
    for (const block of f.blocks) {
        log.logChatty(() => `${block.id}: ${block.children.map((x) => x.id).sort().join(',')}${block.weakChildren.length ? ` (${block.weakChildren.map((x) => x.id).sort().join(',')})` : ''}`);
        if (!block.children.length) {
            f.terminalBlocks.add(block);
        }
    }
}
