import { AstFile } from '../../ast';
import * as ir from '../../ir';
import { IrScope, AnnotatedNode } from './scope';
import * as t from '@babel/types';
import traverse from "@babel/traverse";
import { BlockBuilder } from './builder';
import { trace } from 'console';

/**
 * Traverse the program AST, finding all function and block scopes, and any
 * hoisted declarations they contain.
 */
export function irPreProcess(ast: AstFile): ir.IrProgram {
    const program = new ir.IrProgram(ast.program);

    const scopeStack: IrScope[] = [new IrScope(program, program.globalFunction)];
    const builderStack: BlockBuilder[] = [new BlockBuilder(program.globalFunction)];

    const body = ast.program as AnnotatedNode;
    body.scope = scopeStack[0];
    body.irFunction = program.globalFunction;
    body.builder = builderStack[0];

    traverse(ast, {
        enter(path) {
            if (path.isFunctionDeclaration() || path.isFunctionExpression()) {
                // When we see a function, we create an IrFunction an attach it
                // to this node. The function will track all of our hoisted
                // declarations.
                const f = new ir.IrFunction(path.node, program);
                f.name = path.node.id?.name;
                program.functions.push(f);

                const node = path.node as AnnotatedNode;
                node.irFunction = f;
                node.scope = new IrScope(program, f, scopeStack[scopeStack.length - 1]);

                const builder = node.builder = new BlockBuilder(f);

                if (path.isFunctionDeclaration()) {
                    // Function declarations are defined at any point in the
                    // function scope, so we can add a temp representing the
                    // function here.
                    const scope = scopeStack[scopeStack.length - 1].functionScope;
                    const temp = builderStack[builderStack.length - 1].addTemp(ir.exprFunction(f));
                    temp.requiresRegister = true;
                    // keep function declarations in the global scope
                    if (scopeStack.length < 2) {
                        temp.live = true;
                    }
                    scope.setBinding(path.node.id.name, temp);
                    scope.functionScope.functionNames[path.node.id.name] = f;
                }

                builderStack.push(builder);
                scopeStack.push(node.scope);
            } else if (path.isBlockStatement()) {
                // This creates a new block scope.
                const node = path.node as AnnotatedNode;
                node.scope = new IrScope(program, undefined, scopeStack[scopeStack.length - 1]);
                scopeStack.push(node.scope);
            } else if (path.isVariableDeclaration()) {
                // Bind these vars to a block or function scope.
                for (const decl of path.node.declarations) {
                    if (t.isIdentifier(decl.id)) {
                        const scope = scopeStack[scopeStack.length - 1].functionScope;
                        (path.node.kind === 'var' ? scope.functionScope : scope).varNames.add(decl.id.name);
                        if (path.node.kind === 'var') {
                            // `var` is undefined until we encounter its definition
                            const temp = builderStack[builderStack.length - 1].addTemp(ir.exprLiteral(undefined));
                            scope.setBinding(decl.id.name, temp);
                        }
                    } else {
                        throw new Error(`unsupported var identifier type: ${decl.id.type}`);
                    }
                }
            }
        },
        exit(path) {
            if (path.isFunctionDeclaration() || path.isFunctionExpression()) {
                scopeStack.pop();
                builderStack.pop();
            } else if (path.isBlockStatement()) {
                scopeStack.pop();
            }
        },
    });
    return program;
}
