import { Ast } from '../ast';
import Value from '../value';
import { ExecutionContext } from './context';

export function knownValue(ctx: ExecutionContext, ast: Ast): Value | undefined {
    switch (ast.type) {
        case "StringLiteral":
        case "NumericLiteral":
        case "BooleanLiteral":
            return { value: ast.value };
        case "NullLiteral":
            return { value: null };
        case "RegExpLiteral":
            // TODO
            return { value: new RegExp(ast.pattern) };

        case "Identifier":
            return ctx ? ctx.resolve(ast.name) : undefined;
    }
    return undefined;
}
