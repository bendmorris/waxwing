import * as babelTypes from '@babel/types';
import babelTraverse from '@babel/traverse';
import { Ast } from '../ast';
import { Effect, EffectType } from '../effect';
import { Scope } from '../scope';
import { ValueType, abstractValue, unknownValue } from '../value';
import { ExecutionContext } from './context';
import { evaluate } from './evaluate';
import { knownValue, anyToNode, evalValue, valueToNode, sameLocation } from './utils';

export function eliminateDeadCodeFromBlock(ctx: ExecutionContext, path: babel.NodePath<babelTypes.BlockStatement>, scope: Scope) {
    const node = path.node;
    for (let i = 0; i < node.body.length; ++i) {
        const statement = node.body[i];
        ctx.debugLog(statement, "checking for DCE");
        if (babelTypes.isVariableDeclaration(statement)) {
            for (let j = 0; j < statement.declarations.length; ++j) {
                const decl = statement.declarations[j];
                if (babelTypes.isIdentifier(decl.id)) {
                    const id = decl.id.name;
                    if (scope.has(id) && scope.get(id).refCount <= 0) {
                        statement.declarations.splice(j--, 1);
                    }
                }
            }
            if (statement.declarations.length === 0) {
                node.body.splice(i--, 1);
            }
        } else if (babelTypes.isFunctionDeclaration(statement)) {
            const id = statement.id.name;
            if (scope.has(id) && scope.get(id).refCount <= 0) {
                node.body.splice(i--, 1);
            }
        } else if (babelTypes.isExpressionStatement(statement)) {
            const statements = node.body.length;
            let callStack = 0;
            let assignStack = 0;
            babelTraverse(statement, {
                enter(path) {
                    switch (path.node.type) {
                        case "AssignmentExpression": {
                            if (babelTypes.isIdentifier(path.node.left)) {
                                const id = path.node.left.name;
                                if (scope.has(id) && scope.get(id).refCount <= 0) {
                                    ctx.debugLog(path.node, "replacing dead assignment with RHS");
                                    path.replaceWith(path.node.right);
                                    break;
                                }
                            }
                            ++assignStack;
                            break;
                        }
                        case "CallExpression":
                            ++callStack;
                            break;
                        case "StringLiteral":
                        case "NumericLiteral":
                        case "NullLiteral":
                        case "BooleanLiteral":
                            if (!callStack && !assignStack) {
                                path.remove();
                            }
                    }
                },
                exit(path) {
                    switch (path.node.type) {
                        case "AssignmentExpression":
                            --assignStack;
                            break;
                        case "CallExpression":
                            --callStack;
                            break;
                    }
                }
            }, path.scope, path);
            if (node.body.length < statements) {
                --i;
            }
        }
    }
}
