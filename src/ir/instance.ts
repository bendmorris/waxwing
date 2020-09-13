import { IrBlock } from './block';
import { IrTrivialExpr, IrNewInstanceExpr } from './expr';
import { StmtWithMeta, IrTempStmt, IrStmtMetadata } from './stmt';

export class InstanceGeneration {
    parent?: InstanceGeneration;
    stmt: StmtWithMeta;
    knownProperties: any;
    hasUnknownProperties: boolean;

    constructor(stmt: StmtWithMeta, parent?: InstanceGeneration) {
        this.parent = parent;
        this.stmt = stmt;
        this.knownProperties = {};
        this.hasUnknownProperties = false;
    }

    child(stmt: StmtWithMeta) {
        return new InstanceGeneration(stmt, this);
    }
}

export type InstanceMember = {
    key: IrTrivialExpr | undefined,
    value: IrTrivialExpr,
}

type InstanceTempStmt = IrTempStmt & { expr: IrNewInstanceExpr } & IrStmtMetadata;

export class IrInstanceMetadata {
    block: IrBlock;
    id: number;
    varId: number;
    generations: InstanceGeneration[];
    constructorStmt: InstanceTempStmt;
    constructorExpr: IrNewInstanceExpr;
    currentGenerations: number[];
    isArray: boolean;
    canRelocate: boolean;
    canInline: boolean;

    constructor(block: IrBlock, isArray: boolean, id: number, varId: number, constructor: InstanceTempStmt) {
        this.block = block;
        this.id = id;
        this.varId = varId;
        this.generations = [new InstanceGeneration(constructor)];
        this.constructorStmt = constructor;
        this.constructorExpr = constructor.expr;
        this.currentGenerations = [0];
        this.isArray = isArray;
        this.canRelocate = true;
        this.canInline = false;
    }

    addNewGenerations(stmt: StmtWithMeta): InstanceGeneration[] {
        const newGenerations = [];
        for (let i = 0; i < this.currentGenerations.length; ++i) {
            const cur = this.currentGenerations[i];
            const newGen = this.generations[cur].child(stmt);
            this.currentGenerations[i] = this.generations.length;
            this.generations.push(newGen);
            newGenerations.push(newGen);
        }
        return newGenerations;
    }

    getCurrentGenerations(): InstanceGeneration[] {
        return this.currentGenerations.map((i) => this.generations[i]);
    }
}
