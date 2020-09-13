import * as ir from '../';

describe('IrBlock.dominates', () => {
    test('a block dominates its child block', () => {
        const program = new ir.IrProgram();
        const b1 = program.block();
        const b2 = program.block();
        b1.nextBlock = b2;
        expect(b1.dominates(b2)).toBe(true);
    });

    test('a block dominates branches it contains, but the branch body does not dominate the next block', () => {
        const program = new ir.IrProgram();
        const b1 = program.block();
        const b2 = program.block();
        b1.nextBlock = b2;
        const builder = b1.if();
        builder.condition(ir.exprLiteral(true));
        const b3 = builder.body();
        builder.finish();
        expect(b1.dominates(b2)).toBe(true);
        expect(b1.dominates(b3)).toBe(true);
        expect(b2.dominates(b3)).toBe(false);
    });
});
