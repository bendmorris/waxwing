import { Lvalue } from './lvalue';

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
    lvalue: Lvalue,
}

export function effectMutation(lvalue: Lvalue): EffectMutation {
    return {
        kind: EffectType.Mutation,
        lvalue,
    };
}

export type Effect = EffectIo | EffectMutation;
