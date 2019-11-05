import * as t from '@babel/types';
import { Ast, ExpressionAst } from '../ast';
import { Scope } from '../scope';
import { ExecutionContext } from './context';

/**
 * Simplify an expression whose value is not needed. This should retain any
 * function calls, assignments, etc. that may have side effects.
 *
 * Can return:
 *   - A new AST node if the node can be replaced.
 *   - `null` if the node can be discarded.
 *   - `undefined` if no evaluation was possible.
 */
export function simplifyExpression(ctx: ExecutionContext, ast: ExpressionAst, scope: Scope): ExpressionAst | null | undefined {
    switch (ast.type) {
        case "BinaryExpression": {
            const reduceLeft = simplifyExpression(ctx, ast.left, scope);
            const reduceRight = simplifyExpression(ctx, ast.right, scope);
            if (reduceLeft === null && reduceRight === null) {
                return null;
            } else if (reduceLeft === null) {
                return reduceRight || ast.right;
            } else if (reduceRight === null) {
                return reduceLeft || ast.left;
            } else if (reduceLeft || reduceRight) {
                ast.left = reduceLeft || ast.left;
                ast.right = reduceRight || ast.right;
                return ast;
            } else {
                return undefined;
            }
        }
        case "UnaryExpression": {
            const reduced = simplifyExpression(ctx, ast.argument, scope);
            if (reduced === null) {
                return null;
            } else if (reduced) {
                ast.argument = reduced;
                return ast;
            } else {
                return undefined;
            }
        }
        case "AssignmentExpression": {
            if (t.isIdentifier(ast.left)) {
                const id = ast.left.name;
                if (scope.has(id) && scope.get(id).refCount <= 0) {
                    ctx.log.log(ast, "replacing dead assignment with RHS");
                    const simplified = simplifyExpression(ctx, ast.right, scope);
                    return simplified === undefined ? ast.right : simplified;
                }
            }
            break;
        }
        case "BooleanLiteral":
        case "NumericLiteral":
        case "StringLiteral":
        case "NullLiteral":
        case "Identifier": {
            return null;
        }
    }
    return undefined;
}

export function eliminateDeadCodeFromBlock(ctx: ExecutionContext, node: t.BlockStatement, scope: Scope) {
    for (let i = 0; i < node.body.length; ++i) {
        const statement = node.body[i];
        ctx.log.info(statement, "checking for DCE");
        if (t.isVariableDeclaration(statement)) {
            for (let j = 0; j < statement.declarations.length; ++j) {
                const decl = statement.declarations[j];
                if (t.isIdentifier(decl.id)) {
                    const id = decl.id.name;
                    if (scope.has(id) && scope.get(id).refCount <= 0) {
                        if (decl.init) {
                            // eliminate the variable, but check the expression for side effects
                            node.body.splice(i + 1, 0, t.expressionStatement(decl.init));
                        }
                        ctx.log.log(decl, "removed dead declaration");
                        statement.declarations.splice(j--, 1);
                    }
                }
            }
            if (statement.declarations.length === 0) {
                ctx.log.log(statement, "all declarations removed; removing block");
                node.body.splice(i--, 1);
            }
        } else if (t.isFunctionDeclaration(statement)) {
            ctx.log.log(statement, "removed dead function declaration");
            const id = statement.id.name;
            if (scope.has(id) && scope.get(id).refCount <= 0) {
                node.body.splice(i--, 1);
            }
        } else if (t.isExpressionStatement(statement)) {
            const reduced = simplifyExpression(ctx, statement.expression, scope);
            if (reduced) {
                ctx.log.log(statement.expression, "replaced expression statement with reduced form");
                statement.expression = reduced;
            } else if (reduced === null) {
                ctx.log.log(statement.expression, "removed expression statement");
                node.body.splice(i--, 1);
            }
        }
    }
}
