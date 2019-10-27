import { Constraint } from './constraint';
import { FunctionType, TypeSpec } from './type';

const enum BindingType {
    Var,
    Function,
}

export const enum VarScope {
    Var,
    Let,
    Const,
}

interface BaseBinding {
    kind: BindingType,
    name: string,
    type: TypeSpec,
    constraints: Constraint[]
}

export interface VarBinding extends BaseBinding {
    kind: BindingType.Var,
    scope: VarScope,
}

export interface FunctionBinding extends BaseBinding {
    kind: BindingType.Function,
    type: FunctionType,
}

export type Binding = VarBinding | FunctionBinding;
