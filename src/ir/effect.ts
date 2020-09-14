export const enum EffectType {
    Io,
    Mutation,
}

export interface EffectIo {
    kind: EffectType.Io,
}

export function effectIo(): EffectIo {
    return { kind: EffectType.Io };
}

export interface EffectMutation {
    kind: EffectType.Mutation,
    instanceId: number,
    generationId: number,
}

export function effectMutation(instanceId: number, generationId: number): EffectMutation {
    return {
        kind: EffectType.Mutation,
        instanceId,
        generationId,
    };
}

export type Effect = EffectIo | EffectMutation;
