import { TypeSpec } from './type';

const enum RangeType {
    Gt,
    Lt,
    Gte,
    Lte,
}

const enum ConstraintType {
    Range,
    Type,
}

export interface RangeConstraint {
    kind: ConstraintType.Range,
    rangeType: RangeType,
    value: number
}

export interface TypeConstraint {
    kind: ConstraintType.Type,
    type: TypeSpec
}

export type Constraint = TypeConstraint | RangeConstraint
