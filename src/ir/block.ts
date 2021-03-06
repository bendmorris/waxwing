import * as s from './stmt';
import * as e from './expr';
import * as u from './utils';
import { TempVar } from './temp';
import { IrFunction } from './function';
import { IrProgram } from './program';

export class IrBlock {
    id: number;
    program: IrProgram;
    irFunction: IrFunction;
    container?: s.IrStmt;
    body: s.IrStmt[];
    temps: Record<number, (s.IrTempStmt | s.IrGenerationStmt) & TempVar>;
    next: Record<string, TempVar>;
    // map object instances to current generation
    live: boolean;
    parents: IrBlock[];
    children: IrBlock[];
    // used for loop cycles
    weakChildren: IrBlock[];
    // declarations and assignments: { scope ID: { name: temp ID } }
    varDeclarations: Record<number, Record<string, number>>;
    varAssignments: Record<number, Record<string, number>>;
    available: Record<string, s.IrTempStmt>;
    private _nextTemp: number;

    constructor(irFunction: IrFunction) {
        this.id = -1;
        this.program = irFunction.program;
        this.irFunction = irFunction;
        this.container = undefined;
        this.body = [];
        this.temps = {};
        this.next = {};
        this.varDeclarations = {};
        this.varAssignments = {};
        this.available = {};
        this._nextTemp = 0;
        this.live = true;
        this.parents = [];
        this.children = [];
        this.weakChildren = [];
    }

    get lastStmt(): s.IrStmt | undefined { return this.body[this.body.length - 1]; }

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
    
    nextTemp(): number {
        return this._nextTemp++;
    }

    containedBlock(container?: s.IrStmt) {
        const block = this.irFunction.block();
        block.container = container;
        // this.function.blocks.push(block);
        return block;
    }

    push(stmt: s.IrStmt, index: number = -1) {
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
        if (index === -1) {
            this.body.push(stmt);
        } else {
            this.body.splice(index, 0, stmt);
        }
    }

    toString(): string {
        return this.body.map(s.stmtToString).join('\n') + '\n';
    }
}
