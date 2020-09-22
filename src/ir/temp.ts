export interface TempVar {
    blockId: number,
    varId: number,
}

export function temp(blockId: number, varId: number): TempVar {
    if (varId === undefined) {
        throw new TypeError(`undefined variable in block ${blockId}`);
    }
    return {
        blockId,
        varId,
    };
}

export function tempToString(temp: TempVar) {
    return `$${temp.blockId}:${temp.varId}`;
}
