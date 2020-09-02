import { Ast } from '../ast';
import * as ir from '../ir';
import * as babel from '@babel/core';
import * as t from '@babel/types';

function isValidIdentifier(x) {
    // TODO
    return true;
}

function lvalueToAst(lvalue: ir.Lvalue): t.Expression {
    switch (lvalue.kind) {
        case ir.LvalueType.Local: {
            return t.identifier(`_$${lvalue.id}`);
        }
        case ir.LvalueType.Global: {
            return t.identifier(lvalue.name);
        }
    }
}

function exprToAst(expr: ir.Expr): t.Expression {
    switch (expr.kind) {
        case ir.IrExprType.Arguments: {
            return t.identifier('arguments');
        }
        case ir.IrExprType.Array: {
            throw new Error('TODO');
        }
        case ir.IrExprType.Binop: {
            switch (expr.operator) {
                case '&&':
                case '||': {
                    return t.logicalExpression(expr.operator, exprToAst(expr.left), exprToAst(expr.right));
                }
                case ',': {
                    throw new Error('TODO');
                }
                case '??': {
                    throw new Error('TODO');
                }
                default: {
                    return t.binaryExpression(expr.operator, exprToAst(expr.left), exprToAst(expr.right));
                }
            }
            throw new Error('TODO');
        }
        case ir.IrExprType.Call: {
            if (expr.isNew) {
                throw new Error('TODO');
            } else {
                return t.callExpression(exprToAst(expr.callee), expr.args.map(exprToAst));
            }
        }
        case ir.IrExprType.Function: {
            throw new Error('TODO');
        }
        case ir.IrExprType.GlobalThis: {
            return t.identifier('globalThis');
        }
        case ir.IrExprType.Identifier: {
            return lvalueToAst(expr.lvalue);
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
        case ir.IrExprType.Object: {
            throw new Error('TODO');
        }
        case ir.IrExprType.Property: {
            if (expr.property.kind === ir.IrExprType.Literal && typeof expr.property.value === 'string' && t.isValidIdentifier(expr.property.value)) {
                return t.memberExpression(exprToAst(expr.expr), t.identifier(expr.property.value), false);
            }
            return t.memberExpression(exprToAst(expr.expr), exprToAst(expr.property), true);
        }
        case ir.IrExprType.Raw: {
            return expr.ast as t.Expression;
        }
        case ir.IrExprType.This: {
            return t.thisExpression();
        }
        case ir.IrExprType.Unop: {
            throw new Error('TODO');
        }
    }
}

function blockToAst(block: ir.IrBlock): t.Statement[] {
    const stmts = [];
    for (const stmt of block.body) {
        switch (stmt.kind) {
            case ir.IrStmtType.Assignment: {
                switch (stmt.lvalue.kind) {
                    case ir.LvalueType.Local: {
                        stmts.push(t.expressionStatement(t.assignmentExpression('=', t.identifier('_$' + stmt.lvalue.id), exprToAst(stmt.expr))));
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
            case ir.IrStmtType.FunctionDeclaration: {
                const bodyStmts = blockToAst(stmt.def.body);
                stmts.push(t.functionDeclaration(
                    t.identifier(stmt.def.name),
                    stmt.def.args.map((arg) => arg.defaultValue === undefined ? t.identifier(arg.name) : t.assignmentPattern(t.identifier(arg.name), exprToAst(ir.exprLiteral(arg.defaultValue)))),
                    t.blockStatement(bodyStmts)
                ));
                break;
            }
            case ir.IrStmtType.If: {
                throw new Error('TODO');
            }
            case ir.IrStmtType.Loop: {
                throw new Error('TODO');
            }
            case ir.IrStmtType.Return: {
                stmts.push(t.returnStatement(stmt.expr === undefined ? undefined : exprToAst(stmt.expr)));
                break;
            }
        }
    }
    // skip unused, pure temp values
    // turn unused, non-pure temp values into statements
    // inline temporary values that are only used once, as long as they don't alter effect order
    // allocate registers for all other temporary values, and replace references to them
    return stmts;
}

/**
 * Convert a block of WWIR into a string of JS source.
 */
export function irSerialize(program: ir.IrProgram): string {
    const node = t.program(blockToAst(program.blocks[0]));
    const { code } = babel.transformFromAstSync(node, undefined, {});
    return code + '\n';
}
