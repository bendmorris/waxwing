import { IrBlock } from './block';
import { IrTrivialExpr } from './expr';
import { IrNewInstanceExpr } from './expr';

export class InstanceGeneration {
    parent?: InstanceGeneration;
    knownProperties: any;
    hasUnknownProperties: boolean;

    constructor(parent?: InstanceGeneration) {
        this.parent = parent;
        this.knownProperties = {};
        this.hasUnknownProperties = false;
    }

    child() {
        return new InstanceGeneration(this);
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

    addNewGenerations(): InstanceGeneration[] {
        const newGenerations = [];
        for (let i = 0; i < this.currentGenerations.length; ++i) {
            const cur = this.currentGenerations[i];
            const newGen = this.generations[cur].child();
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
