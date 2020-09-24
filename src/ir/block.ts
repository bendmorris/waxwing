import * as s from './stmt';
import * as e from './expr';
import * as u from './utils';
import { tempToString, TempVar } from './temp';
import { Ast } from '../ast';
import { IrProgram } from './program';
// import { IrFunction } from './function';

class StatementBuilder<T extends s.IrStmt> {
    block: IrBlock;
    program: IrProgram;
    stmt: T;

    constructor(block: IrBlock, stmt: T) {
        this.block = (stmt as s.IrStmt).block = block;
        this.program = block.program;
        this.stmt = stmt;
    }

    finish(): T {
        this.block.push(this.stmt);
        return this.stmt as T;
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

    assign(left: e.IrTrivialExpr, right: e.IrTrivialExpr, operator?: e.BinaryOperator) {
        this.stmt.expr = e.exprAssign(operator, left, right);
        return this;
    }

    set(expr: e.IrTrivialExpr, property: e.IrTrivialExpr, value: e.IrTrivialExpr) {
        this.stmt.expr = e.exprSet(expr, property, value);
        return this;
    }
}

export class TempBuilder extends BaseExprBuilder<s.IrTempStmt> {}

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
    // function: IrFunction;
    container?: s.IrStmt;
    body: s.IrStmt[];
    temps: Record<number, (s.IrTempStmt | s.IrGenerationStmt) & TempVar>;
    next: Record<string, TempVar>;
    // map object instances to current generation
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
        this.next = {};
        this.varDeclarations = {};
        this.varAssignments = {};
        this.available = {};
        this._nextTemp = this._nextInstance = 0;
        this.live = true;
    }

    getTempMetadata(varId: number) { return this.temps[varId]; }
    getTempDefinition(varId: number): s.IrTempStmt | undefined {
        let x = this.temps[varId];
        while (x.kind === s.IrStmtType.Generation) {
            x = this.program.getTemp(x.from.blockId, x.from.varId);
        }
        return x;
    }

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
    
    lastStmt(): s.IrStmt | undefined { return this.body[this.body.length - 1]; }

    nextTemp(): number {
        return this._nextTemp++;
    }

    containedBlock(container?: s.IrStmt) {
        const block = this.program.block();
        block.container = container;
        // this.function.blocks.push(block);
        return block;
    }

    push(stmt: s.IrStmt) {
        switch (stmt.kind) {
            case s.IrStmtType.Temp: {
                if (stmt.varId === undefined) {
                    throw new TypeError("Attempting to assign undefined variable");
                }
                this.temps[stmt.varId] = stmt

                break;
            }
        }
        u.applyToExprsInStmt((expr) => {
            switch (expr.kind) {
                case e.IrExprType.Temp: {
                    const temp = this.program.getTemp(expr.blockId, expr.varId);
                    if (temp && temp.kind == s.IrStmtType.Temp && temp.expr) {
                        u.addReference(stmt, temp);
                    }
                    break;
                }
            }
        }, stmt);
        this.body.push(stmt);
    }

    initStmt(_stmt: object): s.IrStmt {
        const stmt = _stmt as s.IrStmt;
        stmt.block = this;
        Object.assign(stmt, {
            live: false,
            escapes: false,
            references: new Set(),
            backReferences: new Set(),
            effects: [],
        });
        return stmt;
    }

    /**
     * If this expression is already available, return the existing temp var.
     * Otherwise, add a new one and return it.
     */
    addTemp(expr: e.IrExpr): s.IrTempStmt {
        const tempId = this.nextTemp();
        return this.temp(tempId).expr(expr).finish() as s.IrTempStmt;
    }

    newGeneration(stmt: s.IrStmt, temp: TempVar): s.IrGenerationStmt {
        const tempId = this.nextTemp();
        const gen = this.initStmt({
            kind: s.IrStmtType.Generation,
            blockId: this.id,
            varId: tempId,
            from: temp,
            source: stmt,
        }) as s.IrGenerationStmt;
        stmt.effects.push(gen);
        this.temps[gen.varId] = gen;
        this.next[tempToString(temp)] = gen;
        return gen;
    }

    temp(varId: number) {
        const stmt = this.initStmt({
            kind: s.IrStmtType.Temp,
            blockId: this.id,
            varId,
            expr: undefined,
            requiresRegister: true,
            inlined: false,
            escapes: false,
            prev: undefined,
        }) as s.IrTempStmt;
        return new TempBuilder(this, stmt);
    }

    goto(blockId: number) {
        const stmt: s.IrStmt = this.initStmt({ kind: s.IrStmtType.Goto, blockId });
        stmt.live = true;
        this.push(stmt);
        return stmt;   
    }

    if() {
        const stmt = this.initStmt({ kind: s.IrStmtType.If, }) as s.IrIfStmt;
        return new IfBuilder(this, stmt);
    }

    while() {
        const stmt = this.initStmt({ kind: s.IrStmtType.Loop, loopType: s.LoopType.While }) as s.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    doWhile() {
        const stmt = this.initStmt({ kind: s.IrStmtType.Loop, loopType: s.LoopType.DoWhile }) as s.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    forIn() {
        const stmt = this.initStmt({ kind: s.IrStmtType.Loop, loopType: s.LoopType.ForIn }) as s.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    forOf() {
        const stmt = this.initStmt({ kind: s.IrStmtType.Loop, loopType: s.LoopType.ForOf }) as s.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    break() {
        const stmt: s.IrStmt = this.initStmt({ kind: s.IrStmtType.Break, });
        this.push(stmt);
        return stmt;
    }

    continue() {
        const stmt: s.IrStmt = this.initStmt({ kind: s.IrStmtType.Continue, });
        this.push(stmt);
        return stmt;
    }

    return(expr?: e.IrTrivialExpr) {
        const stmt: s.IrStmt = this.initStmt({ kind: s.IrStmtType.Return, expr, });
        this.push(stmt);
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
