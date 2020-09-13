import * as s from './stmt';
import * as e from './expr';
import * as u from './utils';
import { Ast } from '../ast';
import { FunctionDefinition } from './function';
import { IrProgram } from './program';
import { IrInstanceMetadata, InstanceMember } from './instance';
import { IrTempMetadata } from './temp';

class StatementBuilder<T extends s.IrStmt> {
    block: IrBlock;
    program: IrProgram;
    stmt: T;

    constructor(block: IrBlock, stmt: T) {
        this.block = (stmt as s.StmtWithMeta).block = block;
        this.program = block.program;
        this.stmt = stmt;
    }

    finish(): T & s.IrStmtMetadata {
        this.block.push(this.stmt);
        return this.stmt as T & s.IrStmtMetadata;
    }
}

class BaseExprBuilder<T extends s.IrStmt & { expr: e.IrExpr }> extends StatementBuilder<T> {
    expr(expr: e.IrExpr) {
        this.stmt.expr = expr;
        return this;
    }

    raw(ast: Ast) {
        this.stmt.expr = e.exprRaw(ast);
        return this;
    }

    unop(operator: e.UnaryOperator, prefix: boolean, expr: e.IrTrivialExpr) {
        this.stmt.expr = e.exprUnop(operator, prefix, expr);
        return this;
    }

    binop(operator: e.BinaryOperator, left: e.IrTrivialExpr, right: e.IrTrivialExpr) {
        this.stmt.expr = e.exprBinop(operator, left, right);
        return this;
    }

    property(expr: e.IrTrivialExpr, property: e.IrTrivialExpr) {
        this.stmt.expr = e.exprProperty(expr, property);
        return this;
    }

    call(callee: e.IrTrivialExpr, args: e.IrTrivialExpr[], isNew: boolean = false) {
        this.stmt.expr = e.exprCall(callee, args, isNew);
        return this;
    }
}

export class ExprStmtBuilder extends BaseExprBuilder<s.IrExprStmt> {}

export class TempBuilder extends BaseExprBuilder<s.IrTempStmt> {}
export class AssignmentBuilder extends BaseExprBuilder<s.IrAssignmentStmt> {}

export class SetBuilder extends BaseExprBuilder<s.IrSetStmt> {
    object(expr: e.IrTrivialExpr) {
        this.stmt.object = expr;
        return this;
    }

    propertyName(expr: e.IrTrivialExpr | undefined) {
        this.stmt.property = expr;
        return this;
    }
}

export class IfBuilder extends StatementBuilder<s.IrIfStmt> {
    condition(expr: e.IrTrivialExpr) {
        this.stmt.condition = expr;
        return this;
    }

    body() {
        return this.stmt.body ?? (this.stmt.body = this.block.containedBlock(this.stmt));
    }

    else() {
        return this.stmt.elseBody ?? (this.stmt.elseBody = this.block.containedBlock(this.stmt));
    }
}

export class LoopBuilder extends StatementBuilder<s.IrLoopStmt> {
    expr(expr: e.IrTrivialExpr) {
        this.stmt.expr = expr;
        return this;
    }

    body() {
        return this.stmt.body ?? (this.stmt.body = this.block.containedBlock(this.stmt));
    }
}

export class IrBlock {
    id: number;
    program: IrProgram;
    container?: s.StmtWithMeta;
    body: s.StmtWithMeta[];
    temps: Record<number, IrTempMetadata>;
    // map object instances to current generation
    instances: Record<number, IrInstanceMetadata>;
    live: boolean;
    prevBlock?: IrBlock;
    nextBlock?: IrBlock;
    // declarations and assignments: { scope ID: { name: temp ID } }
    varDeclarations: Record<number, Record<string, number>>;
    varAssignments: Record<number, Record<string, number>>;
    available: Record<string, s.IrTempStmt>;
    private _nextTemp: number;
    private _nextInstance: number;

    constructor(program: IrProgram) {
        this.id = -1;
        this.program = program;
        this.container = undefined;
        this.body = [];
        this.temps = {};
        this.instances = {};
        this.varDeclarations = {};
        this.varAssignments = {};
        this.available = {};
        this._nextTemp = this._nextInstance = 0;
        this.live = true;
    }

    getTempMetadata(varId: number) { return this.temps[varId]; }

    addDeclaration(scopeId: number, name: string, tempId: number) {
        if (!this.varDeclarations[scopeId]) {
            this.varDeclarations[scopeId] = {};
        }
        this.varDeclarations[scopeId][name] = tempId;
        this.addAssignment(scopeId, name, tempId);
    }

    addAssignment(scopeId: number, name: string, tempId: number) {
        if (!this.varAssignments[scopeId]) {
            this.varAssignments[scopeId] = {};
        }
        this.varAssignments[scopeId][name] = tempId;
    }
    
    lastStmt(): s.StmtWithMeta | undefined { return this.body[this.body.length - 1]; }

    nextTemp(): number {
        const varId = this._nextTemp++;
        this.temps[varId] = new IrTempMetadata(this.id, varId);
        return varId;
    }

    addInstance(isArray: boolean, definition: InstanceMember[]): IrInstanceMetadata {
        const tempId = this.nextTemp();
        const instanceId = this._nextInstance++;
        const constructor = isArray ? e.exprEmptyArray(instanceId) : e.exprEmptyObject(instanceId);
        constructor.definition = definition;
        const stmt = this.temp(this.id, tempId).expr(constructor).finish();
        return this.instances[instanceId] = new IrInstanceMetadata(this, isArray, instanceId, tempId, stmt as any);
    }

    containedBlock(container?: s.StmtWithMeta) {
        const block = this.program.block();
        block.container = container;
        return block;
    }

    push(stmt: s.StmtWithMeta) {
        stmt.block = this;
        Object.assign(stmt, {
            live: false,
            effects: [],
        });
        let assignedTemp = -1;
        switch (stmt.kind) {
            case s.IrStmtType.Temp: {
                if (stmt.varId === undefined) {
                    throw new TypeError("Attempting to assign undefined variable");
                }
                assignedTemp = stmt.varId;
                this.temps[assignedTemp].origin = stmt;
                this.temps[assignedTemp].definition = stmt.expr;

                switch (stmt.expr.kind) {
                    case e.IrExprType.Function: {
                        this.program.functions.push(stmt.expr.def.body);
                        break;
                    }
                }

                break;
            }
        }
        this.body.push(stmt);
    }

    expr() {
        const stmt = { kind: s.IrStmtType.ExprStmt, expr: undefined} as s.IrExprStmt;
        return new ExprStmtBuilder(this, stmt);
    }

    /**
     * If this expression is already available, return the existing temp var.
     * Otherwise, add a new one and return it.
     */
    addTemp(expr: e.IrExpr): s.IrTempStmt & Partial<s.IrStmtMetadata> {
        const tempId = this.nextTemp();
        return this.temp(this.id, tempId).expr(expr).finish() as s.IrTempStmt;
    }

    temp(blockId: number, varId: number) {
        const stmt = { kind: s.IrStmtType.Temp, blockId, varId, expr: undefined} as s.IrTempStmt;
        return new TempBuilder(this, stmt);
    }

    assign() {
        const stmt = { kind: s.IrStmtType.Assignment, lvalue: undefined, expr: undefined} as s.IrAssignmentStmt;
        return new AssignmentBuilder(this, stmt);
    }

    set() {
        const stmt = { kind: s.IrStmtType.Set, object: undefined, property: undefined, expr: undefined} as s.IrSetStmt;
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
        const stmt: s.StmtWithMeta = { kind: s.IrStmtType.Break, };
        this.push(stmt);
        return stmt;
    }

    continue() {
        const stmt: s.StmtWithMeta = { kind: s.IrStmtType.Continue, };
        this.push(stmt);
        return stmt;
    }

    return(expr?: e.IrTrivialExpr) {
        const stmt: s.StmtWithMeta = { kind: s.IrStmtType.Return, expr, };
        this.push(stmt);
        return stmt;
    }

    function(def: FunctionDefinition) {
        const stmt: s.StmtWithMeta = { kind: s.IrStmtType.FunctionDeclaration, def};
        this.push(stmt)
        return stmt;
    }

    toString(): string {
        return this.body.map(s.stmtToString).join('\n') + '\n';
    }

    /**
     * This block dominates block `other` if, to get to block `other`, all
     * paths must come through this block first.
     */
    dominates(other: IrBlock): boolean {
        let current: IrBlock | undefined = this;
        while (current) {
            if (other === current) {
                return true;
            }
            const stmt = current.body[current.body.length - 1];
            if (stmt) {
                switch (stmt.kind) {
                    case s.IrStmtType.If: {
                        if (other === stmt.body) {
                            return true;
                        }
                        if (other === stmt.elseBody) {
                            return true;
                        }
                        break;
                    }
                    case s.IrStmtType.Loop: {
                        if (other === stmt.body) {
                            return true;
                        }
                        break;
                    }
                }
            }
            current = current.nextBlock;
        }
        return false;
    }
}
