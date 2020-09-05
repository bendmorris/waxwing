import { Ast } from '../ast';
import * as ir from '../ir';
import * as babel from '@babel/core';
import * as t from '@babel/types';

function isValidIdentifier(x) {
    // TODO
    return true;
}

function lvalueToAst(block: ir.IrBlock, lvalue: ir.Lvalue): t.Expression {
    switch (lvalue.kind) {
        case ir.LvalueType.Temp: {
            const meta = block.program.getBlock(lvalue.blockId).getTempMetadata(lvalue.varId);
            if (!meta || !meta.definition) {
                throw new Error(`Unrecognized temp variable: ${ir.lvalueToString(lvalue)}`);
            }
            return exprToAst(block, meta.definition);
        }
        // case ir.LvalueType.Register: {
        //     throw new Error("TODO");
        // }
        case ir.LvalueType.Global: {
            return t.identifier(lvalue.name);
        }
    }
}

function exprToAst(block: ir.IrBlock, expr: ir.Expr): t.Expression {
    function recurse(expr: ir.Expr) {
        return exprToAst(block, expr);
    }
    switch (expr.kind) {
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
        case ir.IrExprType.EmptyArray: {
            return t.arrayExpression([]);
        }
        case ir.IrExprType.EmptyObject: {
            return t.objectExpression([]);
        }
        case ir.IrExprType.Function: {
            throw new Error('TODO');
        }
        case ir.IrExprType.GlobalThis: {
            return t.identifier('globalThis');
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
    for (const stmt of block.body) {
        if (stmt.dead) {
            continue;
        }
        switch (stmt.kind) {
            case ir.IrStmtType.Assignment: {
                switch (stmt.lvalue.kind) {
                    case ir.LvalueType.Temp: {
                        // we don't need to touch temp values; they will either
                        // be promoted to registers, or inlined
                        break;
                    }
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
                stmts.push(t.functionDeclaration(
                    t.identifier(stmt.def.name),
                    stmt.def.args.map((arg) => arg.defaultValue === undefined ? t.identifier(arg.name) : t.assignmentPattern(t.identifier(arg.name), exprToAst(block, ir.exprLiteral(arg.defaultValue)))),
                    t.blockStatement(bodyStmts)
                ));
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
                        // FIXME: if knownBranch is true but the loop breaks, eliminate the loop
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
                        lhs = t.memberExpression(lvalueToAst(block, stmt.lvalue), t.identifier(stmt.property.value), false);
                    } else {
                        lhs = t.memberExpression(lvalueToAst(block, stmt.lvalue), exprToAst(block, stmt.property), false);
                    }
                    stmts.push(t.expressionStatement(t.assignmentExpression('=', lhs, exprToAst(block, stmt.expr))));
                } else {
                    stmts.push(t.expressionStatement(
                        t.callExpression(
                            t.memberExpression(lvalueToAst(block, stmt.lvalue), t.identifier('push')),
                            [exprToAst(block, stmt.expr)]
                        )
                    ));
                }
                break;
            }
        }
    }
    return stmts;
}

/**
 * Convert a block of WWIR into a string of JS source.
 */
export function irSerialize(program: ir.IrProgram): string {
    const node = t.program(blockToAst(program.blocks[0]));
    const { code } = babel.transformFromAstSync(node, undefined, { });
    return code + '\n';
}
