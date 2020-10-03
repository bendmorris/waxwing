import * as ir from '../../ir';
import { Ast } from '../../ast';

/**
 * A BlockBuilder is an interface for constructing the basic blocks that make
 * up a function. As statements are added, new blocks are automatically
 * created.
 */
export class BlockBuilder {
    static forBlock(block: ir.IrBlock): BlockBuilder {
        // FIXME: when creating this way, it should be an error to create a 'next' block...
        return new BlockBuilder(block.irFunction, block);
    }

    program: ir.IrProgram;
    irFunction: ir.IrFunction;

    private _cursor?: ir.IrBlock;
    private _prev?: ir.IrBlock;

    constructor(irFunction: ir.IrFunction, body?: ir.IrBlock) {
        this.program = irFunction.program;
        this.irFunction = irFunction;
        this._cursor = body || irFunction.body;
        this._prev = undefined;
    }

    get cursor() {
        if (!this._cursor) {
            this._cursor = this.irFunction.block();
            if (this._prev) {
                const lastStmt = this._prev.lastStmt;
                switch (lastStmt.kind) {
                    case ir.IrStmtType.If:
                    case ir.IrStmtType.Loop:
                    case ir.IrStmtType.Goto:
                    {
                        lastStmt.then = this._cursor;
                        break;
                    }
                }
                // FIXME: this will go away with better CSE
                this._cursor.available = this._prev.available;

                this._prev = undefined;
            }
        }
        return this._cursor;
    }

    initStmt(_stmt: object): ir.IrStmt {
        const stmt = _stmt as ir.IrStmt;
        Object.assign(stmt, {
            live: true,
            escapes: true,
            references: new Set(),
            backReferences: new Set(),
            effects: [],
        });
        return stmt;
    }

    addTemp(expr: ir.IrExpr): ir.IrTempStmt {
        const tempId = this.cursor.nextTemp();
        return this.temp(tempId).expr(expr).finish() as ir.IrTempStmt;
    }

    prependTemp(expr: ir.IrExpr): ir.IrTempStmt {
        const tempId = this.cursor.nextTemp();
        return this.temp(tempId).expr(expr).finish(0) as ir.IrTempStmt;
    }

    newGeneration(stmt: ir.IrStmt, temp: ir.TempVar): ir.IrGenerationStmt {
        const tempId = this.cursor.nextTemp();
        const gen = this.initStmt({
            kind: ir.IrStmtType.Generation,
            blockId: this.cursor.id,
            varId: tempId,
            from: temp,
            source: stmt,
        }) as ir.IrGenerationStmt;
        stmt.effects.push(gen);
        this.cursor.temps[gen.varId] = gen;
        this.cursor.next[ir.tempToString(temp)] = gen;
        return gen;
    }

    temp(varId: number) {
        const stmt = this.initStmt({
            kind: ir.IrStmtType.Temp,
            blockId: this.cursor.id,
            varId,
            expr: undefined,
            requiresRegister: true,
            inlined: false,
            escapes: false,
            prev: undefined,
        }) as ir.IrTempStmt;
        return new TempBuilder(this, stmt);
    }

    goto(dest: ir.IrBlock, then?: ir.IrBlock) {
        const stmt: ir.IrStmt = this.initStmt({ kind: ir.IrStmtType.Goto, dest, then });
        stmt.live = true;
        this.cursor.push(stmt);
        return stmt;   
    }

    if() {
        const stmt = this.initStmt({ kind: ir.IrStmtType.If, }) as ir.IrIfStmt;
        return new IfBuilder(this, stmt);
    }

    while() {
        const stmt = this.initStmt({ kind: ir.IrStmtType.Loop, loopType: ir.LoopType.While }) as ir.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    doWhile() {
        const stmt = this.initStmt({ kind: ir.IrStmtType.Loop, loopType: ir.LoopType.DoWhile }) as ir.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    forIn() {
        const stmt = this.initStmt({ kind: ir.IrStmtType.Loop, loopType: ir.LoopType.ForIn }) as ir.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    forOf() {
        const stmt = this.initStmt({ kind: ir.IrStmtType.Loop, loopType: ir.LoopType.ForOf }) as ir.IrLoopStmt;
        return new LoopBuilder(this, stmt);
    }

    break() {
        const stmt: ir.IrStmt = this.initStmt({ kind: ir.IrStmtType.Break, });
        this.push(stmt);
        return stmt;
    }

    continue() {
        const stmt: ir.IrStmt = this.initStmt({ kind: ir.IrStmtType.Continue, });
        this.push(stmt);
        return stmt;
    }

    return(expr?: ir.IrTrivialExpr) {
        const stmt: ir.IrStmt = this.initStmt({ kind: ir.IrStmtType.Return, expr, });
        this.push(stmt);
        return stmt;
    }

    push(stmt: ir.IrStmt, index: number = -1) {
        this.cursor.push(stmt, index);
    }

    endBlock() {
        this._prev = this._cursor;
        this._cursor = undefined;
    }

    branch(stmt: ir.IrStmt) {
        const newBlock = this.cursor.containedBlock(stmt);
        return new BlockBuilder(this.irFunction, newBlock);
    }
}

class StatementBuilder<T extends ir.IrStmt> {
    program: ir.IrProgram;
    builder: BlockBuilder;
    stmt: T;

    constructor(builder: BlockBuilder, stmt: T) {
        this.builder = builder;
        this.program = builder.program;
        this.stmt = stmt;
    }

    finish(index: number = -1): T {
        this.builder.push(this.stmt, index);
        return this.stmt as T;
    }
}

class BaseExprBuilder<T extends ir.IrStmt & { expr: ir.IrExpr }> extends StatementBuilder<T> {
    expr(expr: ir.IrExpr) {
        this.stmt.expr = expr;
        return this;
    }

    raw(ast: Ast) {
        this.stmt.expr = ir.exprRaw(ast);
        return this;
    }

    unop(operator: ir.UnaryOperator, prefix: boolean, expr: ir.IrTrivialExpr) {
        this.stmt.expr = ir.exprUnop(operator, prefix, expr);
        return this;
    }

    binop(operator: ir.BinaryOperator, left: ir.IrTrivialExpr, right: ir.IrTrivialExpr) {
        this.stmt.expr = ir.exprBinop(operator, left, right);
        return this;
    }

    property(expr: ir.IrTrivialExpr, property: ir.IrTrivialExpr) {
        this.stmt.expr = ir.exprProperty(expr, property);
        return this;
    }

    call(callee: ir.IrTrivialExpr, args: ir.IrTrivialExpr[], isNew: boolean = false) {
        this.stmt.expr = ir.exprCall(callee, args, isNew);
        return this;
    }

    assign(left: ir.IrTrivialExpr, right: ir.IrTrivialExpr, operator?: ir.BinaryOperator) {
        this.stmt.expr = ir.exprAssign(operator, left, right);
        return this;
    }

    set(expr: ir.IrTrivialExpr, property: ir.IrTrivialExpr, value: ir.IrTrivialExpr) {
        this.stmt.expr = ir.exprSet(expr, property, value);
        return this;
    }
}

export class TempBuilder extends BaseExprBuilder<ir.IrTempStmt> {}

export class IfBuilder extends StatementBuilder<ir.IrIfStmt> {
    condition(expr: ir.IrTrivialExpr) {
        this.stmt.condition = expr;
        return this;
    }

    body() {
        const branch = this.builder.branch(this.stmt);
        this.stmt.body = branch.cursor;
        return branch;
    }

    else() {
        const branch = this.builder.branch(this.stmt);
        this.stmt.elseBody = branch.cursor;
        return branch;
    }

    finish(index: number = -1) {
        const result = super.finish(index);
        this.builder.endBlock();
        return result;
    }
}

export class LoopBuilder extends StatementBuilder<ir.IrLoopStmt> {
    expr(expr: ir.IrTrivialExpr) {
        this.stmt.expr = expr;
        return this;
    }

    body() {
        const branch = this.builder.branch(this.stmt);
        this.stmt.body = branch.cursor;
        return branch;
    }

    finish(index: number = -1) {
        const result = super.finish(index);
        this.builder.endBlock();
        return result;
    }
}
