import { Lvalue } from './lvalue';

export const enum EffectType {
    Io,
    Mutation,
}

export interface EffectIo {
    kind: EffectType.Io,
}

export interface EffectMutation {
    kind: EffectType.Mutation,
    lvalue: Lvalue,
}

export type Effect = EffectIo | EffectMutation;
