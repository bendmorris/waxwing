import { Value } from './value';

export const enum EffectType {
    Io,
    Define,
    SetOffset,
    DeleteOffset
}

export interface IoEffect {
    kind: EffectType.Io,
}

export const ioEffect: IoEffect = { kind: EffectType.Io };

export interface DefineEffect {
    kind: EffectType.Define,
    name: string,
    value: Value,
}

export function createDefineEffect(name: string, value: Value): DefineEffect {
    return {
        kind: EffectType.Define,
        name,
        value
    };
}

export type Effect = IoEffect | DefineEffect;
