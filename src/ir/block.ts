import * as s from './stmt';
import * as e from './expr';
import * as u from './utils';
import { lvalueTemp, LvalueType } from './lvalue';
import { Ast } from '../ast';
import { FunctionDefinition } from './function';
import { IrProgram } from './program';
import { Effect } from './effect';

class StatementBuilder<T extends s.IrStmt> {
    block: IrBlock;
    program: IrProgram;
    stmt: T;

    constructor(block: IrBlock, stmt: T) {
        this.block = block;
        this.program = block.program;
        this.stmt = stmt;
    }

    finish() {
        this.block.push(this.stmt);
    }
}

class BaseExprBuilder<T extends s.IrStmt & { expr: e.Expr }> extends StatementBuilder<T> {
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
    temp(id: number) {
        this.stmt.lvalue = lvalueTemp(this.block.id, id);
        return this;
    }
}

export class SetBuilder extends BaseExprBuilder<s.IrSetStmt> {
    temp(id: number) {
        this.stmt.lvalue = lvalueTemp(this.block.id, id);
        return this;
    }

    propertyName(expr: e.TrivialExpr | undefined) {
        this.stmt.property = expr;
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

export interface IrStmtMetadata {
    id: number,
    dead: boolean,
    effects: Effect[],
}

export type StmtWithMeta = s.IrStmt & Partial<IrStmtMetadata>;

export interface IrTempMetadata {
    varId: number,
    references: s.IrStmt[],
    definition?: e.Expr,
    inlined: boolean,
}

export class IrBlock {
    id: number;
    program: IrProgram;
    body: StmtWithMeta[];
    splits: s.IrStmt[];
    temps: Record<number, IrTempMetadata>;
    private _nextTemp: number;

    constructor(program: IrProgram) {
        this.id = -1;
        this.program = program;
        this.body = [];
        this.temps = {};
        this._nextTemp = 0;
    }

    getTempMetadata(varId: number) {
        return this.temps[varId];
    }

    addReference(varId: number, stmt: s.IrStmt) {
        this.getTempMetadata(varId).references.push(stmt);
    }

    nextTemp(): number {
        const varId = this._nextTemp++;
        const meta = {
            varId,
            references: [],
            definition: undefined,
            inlined: false,
        };
        this.temps[varId] = meta;
        return varId;
    }

    push(stmt: StmtWithMeta) {
        stmt.id = this.body.length;
        Object.assign(stmt, {
            dead: false,
            effects: [],
        });
        let assignedTemp = -1;
        switch (stmt.kind) {
            case s.IrStmtType.Assignment: {
                switch (stmt.lvalue.kind) {
                    case LvalueType.Temp: {
                        if (stmt.lvalue.varId === undefined) {
                            throw new TypeError("Attempting to assign undefined variable");
                        }
                        assignedTemp = stmt.lvalue.varId;
                        this.temps[assignedTemp].definition = stmt.expr;
                        break;
                    }
                    default: {}
                }
                break;
            }
        }
        u.applyToExprsInStmt((expr) => {
            switch (expr.kind) {
                case e.IrExprType.Identifier: {
                    switch (expr.lvalue.kind) {
                        case LvalueType.Temp: {
                            if (expr.lvalue.varId !== assignedTemp) {
                                this.program.getBlock(expr.lvalue.blockId).addReference(expr.lvalue.varId, stmt);
                            }
                            break;
                        }
                        default: {}
                    }
                    break;
                }
                default: {}
            }
        }, stmt);
        this.body.push(stmt);
    }

    expr() {
        const stmt = { kind: s.IrStmtType.ExprStmt, expr: undefined} as s.IrExprStmt;
        return new ExprStmtBuilder(this, stmt);
    }

    assign() {
        const stmt = { kind: s.IrStmtType.Assignment, lvalue: undefined, expr: undefined} as s.IrAssignmentStmt;
        return new AssignmentBuilder(this, stmt);
    }

    set() {
        const stmt = { kind: s.IrStmtType.Set, lvalue: undefined, property: undefined, expr: undefined} as s.IrSetStmt;
        return new SetBuilder(this, stmt);
    }

    if() {
        const stmt = { kind: s.IrStmtType.If, } as s.IrIfStmt;
        return new IfBuilder(this, stmt);
    }

    while() {
        const stmt = { kind: s.IrStmtType.Loop, loopType: s.LoopType.While } as s.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    doWhile() {
        const stmt = { kind: s.IrStmtType.Loop, loopType: s.LoopType.DoWhile } as s.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    forIn() {
        const stmt = { kind: s.IrStmtType.Loop, loopType: s.LoopType.ForIn } as s.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    forOf() {
        const stmt = { kind: s.IrStmtType.Loop, loopType: s.LoopType.ForOf } as s.IrLoopStmt;
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
