import { IrExprType, IrExpr, IrTrivialExpr, exprIdentifier } from './expr';
import { IrBlock } from './block';
import { IrStmtType, IrStmt } from './stmt';

type StmtCallback = (x: IrStmt) => void;
type IrTrivialExprCallback = (x: IrTrivialExpr) => void;

export function applyToStmtsInBlock(f: StmtCallback, block: IrBlock) {
    for (const stmt of block.body) {
        f(stmt);
        switch (stmt.kind) {
            case IrStmtType.FunctionDeclaration: {
                applyToStmtsInBlock(f, stmt.def.body);
                break;
            }
            case IrStmtType.If: {
                applyToStmtsInBlock(f, stmt.body);
                if (stmt.elseBody) {
                    applyToStmtsInBlock(f, stmt.elseBody);
                }
                break;
            }
            case IrStmtType.Loop: {
                applyToStmtsInBlock(f, stmt.body);
                break;
            }
            default: {}
        }
    }
}

export function applyToExprsInBlock(f: IrTrivialExprCallback, block: IrBlock) {
    for (const stmt of block.body) {
        applyToExprsInStmt(f, stmt);
    }
}

export function applyToExprsInStmt(f: IrTrivialExprCallback, stmt: IrStmt) {
    switch (stmt.kind) {
        case IrStmtType.Assignment:
        case IrStmtType.ExprStmt: {
            applyToExprsInExpr(f, stmt.expr);
            break;
        }
        case IrStmtType.FunctionDeclaration: {
            applyToExprsInBlock(f, stmt.def.body);
            break;
        }
        case IrStmtType.If: {
            f(stmt.condition);
            applyToExprsInBlock(f, stmt.body);
            if (stmt.elseBody) {
                applyToExprsInBlock(f, stmt.elseBody);
            }
            break;
        }
        case IrStmtType.Loop: {
            f(stmt.expr);
            applyToExprsInBlock(f, stmt.body);
            break;
        }
        case IrStmtType.Return: {
            if (stmt.expr) {
                f(stmt.expr);
            }
            break;
        }
        case IrStmtType.Set: {
            applyToExprsInExpr(f, exprIdentifier(stmt.lvalue));
            if (stmt.property) {
                applyToExprsInExpr(f, stmt.property);
            }
            applyToExprsInExpr(f, stmt.expr);
        }
    }
}

export function applyToExprsInExpr(f: IrTrivialExprCallback, expr: IrExpr) {
    switch (expr.kind) {
        // trivial
        case IrExprType.Arguments:
        case IrExprType.GlobalThis:
        case IrExprType.Identifier:
        case IrExprType.Literal:
        case IrExprType.Next:
        case IrExprType.Phi:
        case IrExprType.Raw:
        case IrExprType.This: {
            f(expr);
            break;
        }
        // special case for function expressions
        case IrExprType.Function: {
            applyToExprsInBlock(f, expr.def.body);
            break;
        }
        // compound
        case IrExprType.Binop: {
            f(expr.left);
            f(expr.right);
            break;
        }
        case IrExprType.Call: {
            f(expr.callee);
            expr.args.forEach(f);
            break;
        }
        case IrExprType.Property: {
            f(expr.expr);
            f(expr.property);
            break;
        }
        case IrExprType.Unop: {
            f(expr.expr);
            break;
        }
    }
}
