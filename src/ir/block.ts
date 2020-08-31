import { IrStmtType, IrStmt, IrAssignmentStmt, stmtToString, LoopType } from './stmt';
import * as e from './expr';
import { lvalueLocal } from './lvalue';
import { Ast } from '../ast';
import { FunctionDefinition } from './function';

export class AssignmentBuilder {
    stmt: IrAssignmentStmt;

    constructor(stmt: IrAssignmentStmt) {
        this.stmt = stmt;
    }

    local(id: number) {
        this.stmt.lvalue = lvalueLocal(id);
        return this;
    }

    expr(expr: e.Expr) {
        this.stmt.expr = expr;
        return this;
    }

    raw(ast: Ast) {
        this.stmt.expr = e.exprRaw(ast);
        return this;
    }

    unop(operator: e.UnaryOperator, prefix: boolean, expr: e.TrivialExpr) {
        this.stmt.expr = e.exprUnop(operator, prefix, expr);
        return this;
    }

    binop(operator: e.BinaryOperator, left: e.TrivialExpr, right: e.TrivialExpr) {
        this.stmt.expr = e.exprBinop(operator, left, right);
        return this;
    }

    call(callee: e.TrivialExprNoCall, args: e.TrivialExprNoCall[]) {
        this.stmt.expr = e.exprCall(callee, args);
        return this;
    }
}

export class IrBlock {
    body: IrStmt[];

    constructor() {
        this.body = [];
    }

    push(stmt: IrStmt) {
        this.body.push(stmt);
    }

    assign() {
        const assignment = { kind: IrStmtType.Assignment, lvalue: undefined, expr: undefined} as IrAssignmentStmt;
        this.push(assignment);
        return new AssignmentBuilder(assignment);
    }

    if() {
        this.push({ kind: IrStmtType.If, });
        return this;
    }

    else() {
        this.push({ kind: IrStmtType.Else, });
        return this;
    }

    while() {
        this.push({ kind: IrStmtType.Loop, loopType: LoopType.While });
        return this;
    }

    doWhile() {
        this.push({ kind: IrStmtType.Loop, loopType: LoopType.DoWhile });
        return this;
    }

    forIn() {
        this.push({ kind: IrStmtType.Loop, loopType: LoopType.ForIn });
        return this;
    }

    forOf() {
        this.push({ kind: IrStmtType.Loop, loopType: LoopType.ForOf });
        return this;
    }

    break() {
        this.push({ kind: IrStmtType.Break, });
        return this;
    }

    continue() {
        this.push({ kind: IrStmtType.Continue, });
        return this;
    }

    start() {
        this.push({ kind: IrStmtType.StartBlock, });
        return this;
    }

    end() {
        this.push({ kind: IrStmtType.EndBlock, });
        return this;
    }

    return(expr?: e.TrivialExpr) {
        this.push({ kind: IrStmtType.Return, expr, });
        return this;
    }

    function(def: FunctionDefinition) {
        this.push({ kind: IrStmtType.FunctionDeclaration, def})
    }

    toString(): string {
        return this.body.map(stmtToString).join('\n') + '\n';
    }
}
