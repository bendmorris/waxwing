import * as babel from '@babel/core';
import babelTraverse from '@babel/traverse';
import Ast from '../ast';
import CompileContext from './context';
import Scope from '../scope';
import { Binding, BindingType } from '../binding';

function findFunctionArgs(path: Ast, params: Ast[]) {
    if (!path.scope) {
        path.scope = new Scope();
    }
    for (const param of params) {
        if (babel.types.isIdentifier(param)) {
            path.scope.set(param.name, new Binding(BindingType.Arg, param.name, param));
        }
    }
}

function findDeclarationsInBody(path: Ast, body: babel.types.Statement[]) {
    if (!path.scope) {
        path.scope = new Scope();
    }
    for (const child of body) {
        if (babel.types.isVariableDeclaration(child)) {
            let bindingType;
            switch (child.kind) {
                case "var": bindingType = BindingType.Var;
                case "let": bindingType = BindingType.Let;
                case "const": bindingType = BindingType.Const;
            }
            for (const declaration of child.declarations) {
                if (babel.types.isIdentifier(declaration.id)) {
                    if (bindingType === BindingType.Var) {
                        // add twice: initially as undefined, then later initialized
                        path.scope.set(declaration.id.name, new Binding(bindingType, declaration.id.name, declaration, undefined));
                    }
                    const childAst = child as Ast;
                    if (!childAst.scope) {
                        childAst.scope = new Scope();
                    }
                    // TODO: initial value
                    childAst.scope.set(declaration.id.name, new Binding(bindingType, declaration.id.name, declaration));
                }
            }
        } else if (babel.types.isFunctionDeclaration(child)) {
            path.scope.set(child.id.name, new Binding(BindingType.Function, child.id.name, child));
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
export default function findDeclarations(context: CompileContext, ast: Ast) {
    // Annotate the AST with scopes here, containing bindings for arguments,
    // functions and variables that are defined within the scope.
    // Blocks and functions have a scope containing their vars/arguments;
    // individual declaration statements have a scope containing their
    // declarations, which should apply to following statements only.
    babelTraverse(ast, {
        Program(path) {
            findDeclarationsInBody(path.node, path.node.body);
        },
        FunctionDeclaration(path) {
            findFunctionArgs(path.node, path.node.params);
            findDeclarationsInBody(path.node, path.node.body.body);
        },
        BlockStatement(path) {
            findDeclarationsInBody(path.node, path.node.body);
        },
        FunctionExpression(path) {
            findFunctionArgs(path.node, path.node.params);
            findDeclarationsInBody(path.node, path.node.body.body);
        },
        ArrowFunctionExpression(path) {
            findFunctionArgs(path.node, path.node.params);
        },
    });
}
