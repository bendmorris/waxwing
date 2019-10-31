import * as babel from '@babel/core';
import babelTraverse from '@babel/traverse';
import { Ast, addEffect } from '../ast';
import { DefineEffect} from '../effect';
import { Value, ValueType } from '../value';
import { knownValue } from './utils';

function findDeclarationsInBody(path: Ast, body: babel.types.Statement[]) {
    for (const child of body) {
        if (babel.types.isVariableDeclaration(child)) {
            const bindingType = child.kind;
            for (const declaration of child.declarations) {
                if (babel.types.isIdentifier(declaration.id)) {
                    const childAst = child as Ast;
                    let initializer: Value;
                    if (declaration.init) {
                        const known = knownValue(undefined, declaration.init as Ast);
                        initializer = known ? { kind: ValueType.Concrete, value: known } : { kind: ValueType.Abstract, ast: declaration.init as Ast };
                    } else {
                        initializer = { kind: ValueType.Concrete, value: undefined };
                    }
                    if (bindingType === "var") {
                        // hoist var declaration
                        addEffect(path, new DefineEffect(declaration.id.name, { kind: ValueType.Concrete, value: undefined }));
                        addEffect(childAst, new DefineEffect(declaration.id.name, initializer));
                    } else {
                        addEffect(childAst, new DefineEffect(declaration.id.name, initializer));
                    }
                }
            }
        } else if (babel.types.isFunctionDeclaration(child)) {
            // hoist function declaration
            addEffect(path, new DefineEffect(child.id.name, {
                kind: ValueType.Function,
                body: child as Ast,
                isArrowFunction: false
            }));
        }
    }
}

/**
 * Searches the provided AST for declarations, and stores them as inline Scope
 * annotations.
 *
 * @param context
 * @param ast
 */
export default function findDeclarations(ast: Ast) {
    // Annotate the AST with scopes here, containing bindings for arguments,
    // functions and variables that are defined within the scope.
    // Blocks and functions have a scope containing their vars/arguments;
    // individual declaration statements have a scope containing their
    // declarations, which should apply to following statements only.
    babelTraverse(ast, {
        Program(path) {
            findDeclarationsInBody(path.node as Ast, path.node.body);
        },
        FunctionDeclaration(path) {
            findDeclarationsInBody(path.node as Ast, path.node.body.body);
        },
        BlockStatement(path) {
            findDeclarationsInBody(path.node as Ast, path.node.body);
        },
        FunctionExpression(path) {
            findDeclarationsInBody(path.node as Ast, path.node.body.body);
        },
    });
}
