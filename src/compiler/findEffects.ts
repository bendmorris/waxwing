import * as babel from '@babel/core';
import babelTraverse from '@babel/traverse';
import * as babelTypes from '@babel/types';
import { Ast, addEnterEffect, addExitEffect } from '../ast';
import { createDefineEffect } from '../effect';
import { knownValue } from './evaluate';
import { Value, concreteValue, abstractValue, functionValue } from '../value';

function findEffectsInBody(path: Ast, body: babelTypes.Statement[]) {
    for (const child of body) {
        if (babel.types.isVariableDeclaration(child)) {
            const bindingType = child.kind;
            for (const declaration of child.declarations) {
                if (babel.types.isIdentifier(declaration.id)) {
                    let initializer: Value;
                    if (declaration.init) {
                        const known = knownValue(undefined, declaration.init);
                        initializer = known || abstractValue(declaration.init);
                    } else {
                        initializer = concreteValue(undefined);
                    }
                    if (bindingType === "var") {
                        // hoist var declaration
                        addEnterEffect(path, createDefineEffect(declaration.id.name, concreteValue(undefined)));
                        addExitEffect(child, createDefineEffect(declaration.id.name, initializer));
                    } else {
                        addExitEffect(child, createDefineEffect(declaration.id.name, initializer));
                    }
                }
            }
        } else if (babel.types.isFunctionDeclaration(child)) {
            // hoist function declaration
            addEnterEffect(path, createDefineEffect(child.id.name, functionValue(child, false)));
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
export default function findEffects(ast: Ast) {
    // Annotate the AST with scopes here, containing bindings for arguments,
    // functions and variables that are defined within the scope.
    // Blocks and functions have a scope containing their vars/arguments;
    // individual declaration statements have a scope containing their
    // declarations, which should apply to following statements only.
    babelTraverse(ast, {
        Program(path) {
            findEffectsInBody(path.node, path.node.body);
        },
        FunctionDeclaration(path) {
            findEffectsInBody(path.node, path.node.body.body);
        },
        BlockStatement(path) {
            findEffectsInBody(path.node, path.node.body);
        },
        FunctionExpression(path) {
            findEffectsInBody(path.node, path.node.body.body);
        },
        AssignmentExpression(path) {
            if (babelTypes.isIdentifier(path.node.left)) {
                let right;
                if (path.node.operator === '=') {
                    right = path.node.right;
                } else {
                    const operator = path.node.operator.substring(0, path.node.operator.length - 1);
                    right = babelTypes.binaryExpression(operator as any, path.node.left, path.node.right);
                }
                if (right) {
                    addExitEffect(path.node, createDefineEffect(path.node.left.name, abstractValue(right)));
                }
            }
        }
    });
}
