import Value from './value';

export const enum EffectType {
    AddConstraint,
    SetValue,
    Io,
    Define,
    Delete,
    SetOffset,
    DeleteOffset
}

export class DefineEffect {
    kind: EffectType = EffectType.Define;
    name: string;
    value: Value;

    constructor(name: string, value: Value) {
        this.name = name;
        this.value = value;
    }
}

export class DeleteEffect {
    kind: EffectType = EffectType.Delete;
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

export type Effect = DefineEffect | DeleteEffect;
