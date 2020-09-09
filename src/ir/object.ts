export class ObjectGeneration {
    parents?: ObjectGeneration[];

    constructor(parents?: ObjectGeneration[]) {
        this.parents = parents;
    }

    child() {
        return new ObjectGeneration([this]);
    }
}
