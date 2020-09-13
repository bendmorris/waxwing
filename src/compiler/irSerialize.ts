import { Options } from '../options';
import * as ir from '../ir';
import * as babel from '@babel/core';
import * as t from '@babel/types';

function isValidIdentifier(x) {
    // TODO
    return true;
}

function lvalueToAst(block: ir.IrBlock, lvalue: ir.Lvalue): t.Expression {
    switch (lvalue.kind) {
        // case ir.LvalueType.Register: {
        //     throw new Error("TODO");
        // }
        case ir.LvalueType.Global: {
            return t.identifier(lvalue.name);
        }
    }
}

function exprToAst(block: ir.IrBlock, expr: ir.IrExpr): t.Expression {
    function recurse(expr: ir.IrExpr) {
        return exprToAst(block, expr);
    }
    switch (expr.kind) {
        case ir.IrExprType.Temp: {
            const meta = block.program.getBlock(expr.blockId).getTempMetadata(expr.varId);
            if (!meta || !meta.definition) {
                throw new Error(`Unrecognized temp variable: ${ir.tempToString(expr)}`);
            }
            return exprToAst(block, meta.definition);
        }
        case ir.IrExprType.Arguments: {
            return t.identifier('arguments');
        }
        case ir.IrExprType.Binop: {
            switch (expr.operator) {
                case '&&':
                case '||':
                case '??': {
                    return t.logicalExpression(expr.operator, recurse(expr.left), recurse(expr.right));
                }
                case ',': {
                    return t.sequenceExpression([recurse(expr.left), recurse(expr.right)]);
                }
                default: {
                    return t.binaryExpression(expr.operator, recurse(expr.left), recurse(expr.right));
                }
            }
        }
        case ir.IrExprType.Call: {
            if (expr.isNew) {
                throw new Error('TODO');
            } else {
                return t.callExpression(recurse(expr.callee), expr.args.map(recurse));
            }
        }
        case ir.IrExprType.NewInstance: {
            if (expr.isArray) {
                return t.arrayExpression(expr.definition.map((x) => recurse(x.value)));
            } else {
                return t.objectExpression(expr.definition.map((x) => {
                    let key = recurse(x.key),
                        computed = true;
                    switch (x.key.kind) {
                        case ir.IrExprType.Literal: {
                            if (typeof(x.key.value) === 'string' && isValidIdentifier(x.key.value)) {
                                key = t.identifier(x.key.value);
                                computed = false;
                            }
                        }
                    }
                    return t.objectProperty(key, recurse(x.value), computed);
                }));
            }
        }
        case ir.IrExprType.Function: {
            const def = expr.def;
            const bodyStmts = blockToAst(def.body);
            return t.functionExpression(
                def.name ? t.identifier(def.name) : undefined,
                def.args.map((arg) => arg.defaultValue === undefined ? t.identifier(arg.name) : t.assignmentPattern(t.identifier(arg.name), exprToAst(block, ir.exprLiteral(arg.defaultValue)))),
                t.blockStatement(bodyStmts)
            );
        }
        case ir.IrExprType.Identifier: {
            return lvalueToAst(block, expr.lvalue);
        }
        case ir.IrExprType.Literal: {
            if (expr.value === null) {
                return t.nullLiteral();
            } else if (expr.value === undefined) {
                return t.identifier('undefined');
            } else if (typeof expr.value === 'boolean') {
                return t.booleanLiteral(expr.value);
            } else if (typeof expr.value === 'number') {
                return t.numericLiteral(expr.value);
            } else if (typeof expr.value === 'string') {
                return t.stringLiteral(expr.value);
            } else {
                throw new TypeError(`unsupported literal value: ${expr.value}`);
            }
        }
        case ir.IrExprType.Property: {
            if (expr.property.kind === ir.IrExprType.Literal && typeof expr.property.value === 'string' && t.isValidIdentifier(expr.property.value)) {
                return t.memberExpression(recurse(expr.expr), t.identifier(expr.property.value), false);
            }
            return t.memberExpression(recurse(expr.expr), recurse(expr.property), true);
        }
        case ir.IrExprType.Raw: {
            return expr.ast as t.Expression;
        }
        case ir.IrExprType.This: {
            return t.thisExpression();
        }
        case ir.IrExprType.Unop: {
            return t.unaryExpression(expr.operator, recurse(expr.expr), expr.prefix);
        }
    }
}

function blockToAst(block: ir.IrBlock, stmts?: t.Statement[]): t.Statement[] {
    const program = block.program;
    if (!stmts) {
        stmts = [];
    }
    while (block) {
        for (const stmt of block.body) {
            if (!stmt.live) {
                continue;
            }
            switch (stmt.kind) {
                case ir.IrStmtType.Assignment: {
                    switch (stmt.lvalue.kind) {
                        default: throw new Error('TODO');
                    }
                    break;
                }
                case ir.IrStmtType.Break: {
                    stmts.push(t.breakStatement());
                    break;
                }
                case ir.IrStmtType.Continue: {
                    stmts.push(t.continueStatement());
                    break;
                }
                case ir.IrStmtType.ExprStmt: {
                    if (stmt.effects.length) {
                        stmts.push(t.expressionStatement(exprToAst(block, stmt.expr)));
                    }
                    break;
                }
                case ir.IrStmtType.FunctionDeclaration: {
                    const bodyStmts = blockToAst(stmt.def.body);
                    // FIXME...
                    if (stmt.def.name) {
                        stmts.push(t.functionDeclaration(
                            t.identifier(stmt.def.name),
                            stmt.def.args.map((arg) => arg.defaultValue === undefined ? t.identifier(arg.name) : t.assignmentPattern(t.identifier(arg.name), exprToAst(block, ir.exprLiteral(arg.defaultValue)))),
                            t.blockStatement(bodyStmts)
                        ));
                    }
                    break;
                }
                case ir.IrStmtType.If: {
                    if (stmt.knownBranch === true) {
                        blockToAst(stmt.body, stmts);
                    } else if (stmt.knownBranch === false) {
                        if (stmt.elseBody) {
                            blockToAst(stmt.elseBody, stmts);
                        }
                    } else {
                        stmts.push(t.ifStatement(
                            exprToAst(block, stmt.condition),
                            t.blockStatement(blockToAst(stmt.body)),
                            stmt.elseBody ? t.blockStatement(blockToAst(stmt.elseBody)) : undefined
                        ));
                    }
                    break;
                }
                case ir.IrStmtType.Loop: {
                    switch (stmt.loopType) {
                        case ir.LoopType.While: {
                            // TODO: if knownBranch is true but the loop breaks, eliminate the loop
                            // FIXME: a `continue` at the end of the body should be removed
                            if (stmt.knownBranch === false) {
                                // noop
                            } else {
                                stmts.push(t.whileStatement(
                                    exprToAst(block, stmt.expr),
                                    t.blockStatement(blockToAst(stmt.body))
                                ));
                            }
                            break;
                        }
                        case ir.LoopType.DoWhile: {
                            if (stmt.knownBranch === false) {
                                // we know this loop will execute exactly once
                                // FIXME: this will still include `break` and `continue`
                                blockToAst(stmt.body, stmts);
                            } else {
                                stmts.push(t.doWhileStatement(
                                    exprToAst(block, stmt.expr),
                                    t.blockStatement(blockToAst(stmt.body))
                                ));
                            }
                            break;
                        }
                        case ir.LoopType.ForIn: {
                            throw new Error("TODO");
                            break;
                        }
                        case ir.LoopType.ForOf: {
                            throw new Error("TODO");
                            break;
                        }
                    }
                    break;
                }
                case ir.IrStmtType.Return: {
                    stmts.push(t.returnStatement(stmt.expr === undefined ? undefined : exprToAst(block, stmt.expr)));
                    break;
                }
                case ir.IrStmtType.Set: {
                    let lhs;
                    if (stmt.property) {
                        if (stmt.property.kind === ir.IrExprType.Literal && typeof stmt.property.value === 'string' && isValidIdentifier(stmt.property.value)) {
                            lhs = t.memberExpression(exprToAst(block, stmt.object), t.identifier(stmt.property.value), false);
                        } else {
                            lhs = t.memberExpression(exprToAst(block, stmt.object), exprToAst(block, stmt.property), false);
                        }
                        stmts.push(t.expressionStatement(t.assignmentExpression('=', lhs, exprToAst(block, stmt.expr))));
                    } else {
                        stmts.push(t.expressionStatement(
                            t.callExpression(
                                t.memberExpression(exprToAst(block, stmt.object), t.identifier('push')),
                                [exprToAst(block, stmt.expr)]
                            )
                        ));
                    }
                    break;
                }
                case ir.IrStmtType.Temp: {
                    // we don't need assignments for temp values...
                    if (stmt.effects.length) {
                        // ...but we need to preserve effects
                        stmts.push(t.expressionStatement(exprToAst(block, stmt.expr)));
                    }
                    break;
                }
            }
        }
        block = block.nextBlock;
    }
    return stmts;
}

/**
 * Convert a block of WWIR into a string of JS source.
 */
export function irSerialize(program: ir.IrProgram, options: Options): string {
    const node = t.program(blockToAst(program.blocks[0]));
    const { code } = babel.transformFromAstSync(node, undefined, { compact: options.compact });
    return code + '\n';
}
