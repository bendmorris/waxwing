const enum ConcreteType {
    Undefined,
    Null,
    Boolean,
    Number,
    String,
    Array,
    Object,
    Function,
    Unknown,
    Union
}

export interface UndefinedType {
    kind: ConcreteType.Undefined
}

export interface NullType {
    kind: ConcreteType.Null
}

export interface BooleanType {
    kind: ConcreteType.Boolean
}

export interface NumberType {
    kind: ConcreteType.Number
}

export interface StringType {
    kind: ConcreteType.String
}

export interface ArrayType {
    kind: ConcreteType.Array,
    types: TypeSpec[]
}

export interface FieldSpec {
    name: string,
    type: TypeSpec
}

export interface ObjectType {
    kind: ConcreteType.Object,
    fields: FieldSpec[]
}

export interface ArgSpec {
    name: string,
    type: TypeSpec,
}

export interface FunctionType {
    kind: ConcreteType.Function,
    argTypes: ArgSpec[],
    returnType: TypeSpec,
}

export interface UnknownType {
    kind: ConcreteType.Unknown
}

export interface UnionType {
    kind: ConcreteType.Union,
    types: TypeSpec[],
}

export type TypeSpec =
    UndefinedType |
    NullType |
    BooleanType |
    NumberType |
    StringType |
    ArrayType |
    ObjectType |
    FunctionType |
    UnknownType |
    UnionType
