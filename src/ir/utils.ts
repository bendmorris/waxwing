import { IrExprType, IrExpr } from './expr';
import { IrBlock } from './block';
import { IrStmtType, IrStmt } from './stmt';

type StmtCallback = (x: IrStmt) => void;
type IrExprCallback = (x: IrExpr) => void;

export function addReference(from: IrStmt, to: IrStmt) {
    from.references.add(to);
    to.backReferences.add(from);
}

export function removeReference(from: IrStmt, to: IrStmt) {
    from.references.delete(to);
    to.backReferences.delete(from);
}

export function applyToStmtsInBlock(f: StmtCallback, block: IrBlock) {
    for (const stmt of block.body) {
        f(stmt);
        switch (stmt.kind) {
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
        }
    }
}

export function applyToExprsInBlock(f: IrExprCallback, block: IrBlock) {
    for (const stmt of block.body) {
        applyToExprsInStmt(f, stmt);
    }
}

export function applyToExprsInStmt(f: IrExprCallback, stmt: IrStmt) {
    switch (stmt.kind) {
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
        case IrStmtType.Temp: {
            applyToExprsInExpr(f, stmt.expr);
            break;
        }
    }
}

export function applyToExprsInExpr(f: IrExprCallback, expr: IrExpr) {
    f(expr);
    switch (expr.kind) {
        // special case for function expressions
        // case IrExprType.Function: {
        //     applyToExprsInBlock(f, expr.def.body);
        //     break;
        // }
        // compound
        case IrExprType.Assign: {
            f(expr.left);
            f(expr.right);
            break;
        }
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
        case IrExprType.Set: {
            f(expr.expr);
            if (expr.property) {
                f(expr.property);
            }
            f(expr.value);
            break;
        }
        case IrExprType.Unop: {
            f(expr.expr);
            break;
        }
    }
}
