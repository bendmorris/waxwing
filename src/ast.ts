// import Value from './value';
import Scope from './scope';
import * as babel from '@babel/core';

interface AstData {
    knownValue?: any,
    scope?: Scope,
}

type Ast = babel.Node & AstData;

export default Ast;
