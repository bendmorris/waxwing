import * as s from './stmt';
import * as e from './expr';
import { lvalueLocal } from './lvalue';
import { Ast } from '../ast';
import { FunctionDefinition } from './function';
import { IrProgram } from './program';
import { throwStatement } from '@babel/types';

class StatementBuilder<T extends s.IrBase> {
    block: IrBlock;
    program: IrProgram;
    stmt: T;

    constructor(block: IrBlock, stmt: T) {
        this.block = block;
        this.program = block.program;
        this.stmt = stmt;
    }
}

class BaseExprBuilder<T extends s.IrBase & { expr: e.Expr }> extends StatementBuilder<T> {
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

    property(expr: e.TrivialExpr, property: e.TrivialExpr) {
        this.stmt.expr = e.exprProperty(expr, property);
        return this;
    }

    call(callee: e.TrivialExpr, args: e.TrivialExpr[], isNew: boolean = false) {
        this.stmt.expr = e.exprCall(callee, args, isNew);
        return this;
    }
}

export class ExprStmtBuilder extends BaseExprBuilder<s.IrExprStmt> {}

export class AssignmentBuilder extends BaseExprBuilder<s.IrAssignmentStmt> {
    local(id: number) {
        this.stmt.lvalue = lvalueLocal(this.block.id, id);
        return this;
    }
}

export class IfBuilder extends StatementBuilder<s.IrIfStmt> {
    condition(expr: e.TrivialExpr) {
        this.stmt.condition = expr;
        return this;
    }

    body() {
        return this.stmt.body ?? (this.stmt.body = this.program.block());
    }

    else() {
        return this.stmt.elseBody ?? (this.stmt.elseBody = this.program.block());
    }
}

export class LoopBuilder extends StatementBuilder<s.IrLoopStmt> {
    expr(expr: e.TrivialExpr) {
        this.stmt.expr = expr;
        return this;
    }

    body() {
        return this.stmt.body ?? (this.stmt.body = this.program.block());
    }
}

export class IrBlock {
    id: number;
    program: IrProgram;
    body: s.IrStmt[];
    ownLocals: Record<string, e.TrivialExpr>;
    private _nextLocal: number;

    constructor(program: IrProgram) {
        this.id = -1;
        this.program = program;
        this.body = [];
        // this.locals = {};
        this._nextLocal = 0;
    }

    nextLocal(): number {
        return this._nextLocal++;
    }

    push(stmt: s.IrStmt) {
        this.body.push(stmt);
    }

    expr() {
        const stmt = { kind: s.IrStmtType.ExprStmt, expr: undefined} as s.IrExprStmt;
        this.push(stmt);
        return new ExprStmtBuilder(this, stmt);
    }

    assign() {
        const stmt = { kind: s.IrStmtType.Assignment, lvalue: undefined, expr: undefined} as s.IrAssignmentStmt;
        this.push(stmt);
        return new AssignmentBuilder(this, stmt);
    }

    if() {
        const stmt = { kind: s.IrStmtType.If, } as s.IrIfStmt;
        this.push(stmt);
        return new IfBuilder(this, stmt);
    }

    while() {
        const stmt = { kind: s.IrStmtType.Loop, loopType: s.LoopType.While } as s.IrLoopStmt;
        this.push(stmt);
        return new LoopBuilder(this, stmt);
    }

    doWhile() {
        const stmt = { kind: s.IrStmtType.Loop, loopType: s.LoopType.DoWhile } as s.IrLoopStmt;
        this.push(stmt);
        return new LoopBuilder(this, stmt);
    }

    forIn() {
        const stmt = { kind: s.IrStmtType.Loop, loopType: s.LoopType.ForIn } as s.IrLoopStmt;
        this.push(stmt);
        return new LoopBuilder(this, stmt);
    }

    forOf() {
        const stmt = { kind: s.IrStmtType.Loop, loopType: s.LoopType.ForOf } as s.IrLoopStmt;
        this.push(stmt);
        return new LoopBuilder(this, stmt);
    }

    break() {
        this.push({ kind: s.IrStmtType.Break, });
        return this;
    }

    continue() {
        this.push({ kind: s.IrStmtType.Continue, });
        return this;
    }

    return(expr?: e.TrivialExpr) {
        this.push({ kind: s.IrStmtType.Return, expr, });
        return this;
    }

    function(def: FunctionDefinition) {
        this.push({ kind: s.IrStmtType.FunctionDeclaration, def})
    }

    toString(): string {
        return this.body.map(s.stmtToString).join('\n') + '\n';
    }
}
