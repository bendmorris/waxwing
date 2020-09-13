import { IrBlock } from './block';
import { IrTrivialExpr } from './expr';
import { IrNewInstanceExpr } from './expr';

export class InstanceGeneration {
    parents?: InstanceGeneration[];

    constructor(parents?: InstanceGeneration[]) {
        this.parents = parents;
    }

    child() {
        return new InstanceGeneration([this]);
    }
}

export type InstanceMember = {
    key: IrTrivialExpr | undefined,
    value: IrTrivialExpr,
}

export class IrInstanceMetadata {
    block: IrBlock;
    id: number;
    varId: number;
    generations: InstanceGeneration[];
    constructorExpr: IrNewInstanceExpr;
    currentGenerations: number[];
    isArray: boolean;
    canRelocate: boolean;
    canInline: boolean;

    constructor(block: IrBlock, isArray: boolean, id: number, varId: number, constructorExpr: IrNewInstanceExpr) {
        this.block = block;
        this.id = id;
        this.varId = varId;
        this.generations = [new InstanceGeneration()];
        this.constructorExpr = constructorExpr;
        this.currentGenerations = [0];
        this.isArray = isArray;
        this.canRelocate = true;
        this.canInline = false;
    }
}
