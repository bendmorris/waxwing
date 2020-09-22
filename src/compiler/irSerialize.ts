import { Options } from '../options';
import * as ir from '../ir';
import { isLive } from './liveness';
import * as babel from '@babel/core';
import * as t from '@babel/types';

class SerializeContext {
    registers: Record<number, Record<number, number>>;
    nextRegister: number;

    constructor() {
        this.registers = {};
        this.nextRegister = 0;
    }

    registerFor(blockId: number, varId: number): number {
        if (!this.registers[blockId]) {
            this.registers[blockId] = {};
        }
        if (this.registers[blockId][varId] === undefined) {
            this.registers[blockId][varId] = this.nextRegister++;
        }
        return this.registers[blockId][varId];
    }
}

function isValidIdentifier(x) {
    // TODO
    x;
    return true;
}

function lvalueToAst(block: ir.IrBlock, lvalue: ir.Lvalue): t.Expression {
    switch (lvalue.kind) {
        // case ir.LvalueType.Register: {
        //     throw new Error("TODO");
        // }
        case ir.LvalueType.Global: {
            return t.identifier(lvalue.name);
        }
    }
}

function registerName(registerId: number): string {
    return `$_r${registerId}`;
}

// function refersToInstanceState(program: ir.IrProgram, ) 

function exprToAst(ctx: SerializeContext, block: ir.IrBlock, expr: ir.IrExpr): t.Expression {
    const program = block.program;
    function recurse(expr: ir.IrExpr) {
        return exprToAst(ctx, block, expr);
    }
    switch (expr.kind) {
        case ir.IrExprType.Temp: {
            const meta = program.getBlock(expr.blockId).getTempMetadata(expr.varId);
            if (!meta || !meta.expr) {
                throw new Error(`Unrecognized temp variable: ${ir.tempToString(expr)}`);
            }
            if (meta.expr.kind === ir.IrExprType.Function && meta.expr.def.name) {
                return t.identifier(meta.expr.def.name);
            } else if (meta.requiresRegister) {
                return t.identifier(registerName(ctx.registerFor(expr.blockId, expr.varId)));
            }
            return exprToAst(ctx, block, meta.expr);
        }
        case ir.IrExprType.Arguments: {
            return t.identifier('arguments');
        }
        case ir.IrExprType.Assign: {
            return t.assignmentExpression((expr.operator || '') + '=', recurse(expr.left) as t.LVal, recurse(expr.right));
        }
        case ir.IrExprType.Binop: {
            switch (expr.operator) {
                case '&&':
                case '||':
                case '??': {
                    return t.logicalExpression(expr.operator, recurse(expr.left), recurse(expr.right));
                }
                case ',': {
                    return t.sequenceExpression([recurse(expr.left), recurse(expr.right)]);
                }
                default: {
                    return t.binaryExpression(expr.operator, recurse(expr.left), recurse(expr.right));
                }
            }
        }
        case ir.IrExprType.Call: {
            if (expr.isNew) {
                throw new Error('TODO');
            } else {
                return t.callExpression(recurse(expr.callee), expr.args.map(recurse));
            }
        }
        case ir.IrExprType.NewObject: {
            return t.objectExpression(expr.members.map((x) => {
                let key = recurse(x.key),
                    computed = true;
                switch (x.key.kind) {
                    case ir.IrExprType.Literal: {
                        if (typeof(x.key.value) === 'string' && isValidIdentifier(x.key.value)) {
                            key = t.identifier(x.key.value);
                            computed = false;
                        }
                    }
                }
                return t.objectProperty(key, recurse(x.value), computed);
            }));
        }
        case ir.IrExprType.NewArray: {
            return t.arrayExpression(expr.values.map(recurse));
        }
        case ir.IrExprType.Function: {
            const def = expr.def;
            const bodyStmts = blockToAst(ctx, def.body);
            return t.functionExpression(
                def.name ? t.identifier(def.name) : undefined,
                def.args.map((arg) => arg.defaultValue === undefined ? t.identifier(arg.name) : t.assignmentPattern(t.identifier(arg.name), exprToAst(ctx, block, ir.exprLiteral(arg.defaultValue)))),
                t.blockStatement(bodyStmts)
            );
        }
        case ir.IrExprType.Identifier: {
            return lvalueToAst(block, expr.lvalue);
        }
        case ir.IrExprType.Literal: {
            if (expr.value === null) {
                return t.nullLiteral();
            } else if (expr.value === undefined) {
                return t.identifier('undefined');
            } else if (typeof expr.value === 'boolean') {
                return t.booleanLiteral(expr.value);
            } else if (typeof expr.value === 'number') {
                return t.numericLiteral(expr.value);
            } else if (typeof expr.value === 'string') {
                return t.stringLiteral(expr.value);
            } else {
                throw new TypeError(`unsupported literal value: ${expr.value}`);
            }
        }
        case ir.IrExprType.Property: {
            if (expr.property.kind === ir.IrExprType.Literal && typeof expr.property.value === 'string' && t.isValidIdentifier(expr.property.value)) {
                return t.memberExpression(recurse(expr.expr), t.identifier(expr.property.value), false);
            }
            return t.memberExpression(recurse(expr.expr), recurse(expr.property), true);
        }
        case ir.IrExprType.Raw: {
            return expr.ast as t.Expression;
        }
        case ir.IrExprType.Set: {
            let target;
            if (expr.expr.kind === ir.IrExprType.Temp) {
                let current: ir.TempVar = expr.expr;
                do {
                    const meta = program.getTemp(current.blockId, current.varId);
                    if (meta.requiresRegister) {
                        target = t.identifier(registerName(ctx.registerFor(current.blockId, current.varId)));   
                        break;
                    }
                    current = meta.prev;
                } while (current);
                if (!target) {
                    target = exprToAst(ctx, block, expr.expr);
                }
            } else {
                target = exprToAst(ctx, block, expr.expr);
            }
            let lhs;
            if (expr.property) {
                if (expr.property.kind === ir.IrExprType.Literal && typeof expr.property.value === 'string' && isValidIdentifier(expr.property.value)) {
                    lhs = t.memberExpression(target, t.identifier(expr.property.value), false);
                } else {
                    lhs = t.memberExpression(target, exprToAst(ctx, block, expr.property), false);
                }
                return t.assignmentExpression('=', lhs, exprToAst(ctx, block, expr.value));
            } else {
                t.callExpression(
                    t.memberExpression(target, t.identifier('push')),
                    [exprToAst(ctx, block, expr.value)]
                );
            }
            break;
        }
        case ir.IrExprType.This: {
            return t.thisExpression();
        }
        case ir.IrExprType.Unop: {
            return t.unaryExpression(expr.operator, recurse(expr.expr), expr.prefix);
        }
    }
}

function blockToAst(ctx: SerializeContext, block: ir.IrBlock, stmts?: t.Statement[]): t.Statement[] {
    const program = block.program;
    if (!stmts) {
        stmts = [];
    }
    while (block) {
        let i = 0;
        while (i < block.body.length) {
            const stmt  = block.body[i];
            if (!isLive(stmt)) {
                ++i;
                continue;
            }
            switch (stmt.kind) {
                case ir.IrStmtType.Break: {
                    stmts.push(t.breakStatement());
                    break;
                }
                case ir.IrStmtType.Continue: {
                    stmts.push(t.continueStatement());
                    break;
                }
                case ir.IrStmtType.Goto: {
                    blockToAst(ctx, program.getBlock(stmt.blockId), stmts);
                    break;
                }
                case ir.IrStmtType.If: {
                    stmts.push(t.ifStatement(
                        exprToAst(ctx, block, stmt.condition),
                        t.blockStatement(blockToAst(ctx, stmt.body)),
                        stmt.elseBody ? t.blockStatement(blockToAst(ctx, stmt.elseBody)) : undefined
                    ));
                    break;
                }
                case ir.IrStmtType.Loop: {
                    switch (stmt.loopType) {
                        case ir.LoopType.While: {
                            stmts.push(t.whileStatement(
                                exprToAst(ctx, block, stmt.expr),
                                t.blockStatement(blockToAst(ctx, stmt.body))
                            ));
                            break;
                        }
                        case ir.LoopType.DoWhile: {
                            stmts.push(t.doWhileStatement(
                                exprToAst(ctx, block, stmt.expr),
                                t.blockStatement(blockToAst(ctx, stmt.body))
                            ));
                            break;
                        }
                        case ir.LoopType.ForIn: {
                            throw new Error("TODO");
                            break;
                        }
                        case ir.LoopType.ForOf: {
                            throw new Error("TODO");
                            break;
                        }
                    }
                    break;
                }
                case ir.IrStmtType.Return: {
                    stmts.push(t.returnStatement(stmt.expr === undefined ? undefined : exprToAst(ctx, block, stmt.expr)));
                    break;
                }
                case ir.IrStmtType.Temp: {
                    const meta = program.getBlock(stmt.blockId).getTempMetadata(stmt.varId);
                    switch (stmt.expr.kind) {
                        case ir.IrExprType.Function: {
                            const def = stmt.expr.def;
                            let name = def.name;
                            if (!name) {
                                const register = ctx.registerFor(stmt.blockId, stmt.varId)
                                name = registerName(register);
                            }
                            const bodyStmts = blockToAst(ctx, def.body);
                            stmts.push(t.functionDeclaration(
                                t.identifier(name),
                                def.args.map((arg) => t.identifier(arg.name)),
                                t.blockStatement(bodyStmts)
                            ));
                            break;
                        }
                        default: {
                            if (meta.requiresRegister) {
                                const register = ctx.registerFor(stmt.blockId, stmt.varId);
                                stmts.push(t.variableDeclaration("var", [
                                    t.variableDeclarator(t.identifier(registerName(register)), exprToAst(ctx, block, stmt.expr))
                                ]));
                            } else if (stmt.effects.length && !meta.inlined) {
                                // we need to preserve this effectful function call, but we don't need its value
                                stmts.push(t.expressionStatement(exprToAst(ctx, block, stmt.expr)));
                            }
                            break;
                        }
                    }
                }
            }
            ++i;
        }
        block = block.nextBlock;
    }
    return stmts;
}

/**
 * Convert a block of WWIR into a string of JS source.
 */
export function irSerialize(program: ir.IrProgram, options: Options): string {
    const ctx = new SerializeContext();
    const node = t.program(blockToAst(ctx, program.blocks[0]));
    const { code } = babel.transformFromAstSync(node, undefined, { compact: options.compact });
    return code + '\n';
}
