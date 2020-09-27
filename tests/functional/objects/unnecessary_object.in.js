/**
 * UNIMPLEMENTED: instance materialization
 *
 * Since `x.b` is statically known and `x` does not escape, we can avoid
 * creating the object.
 */
function f() {
    var x = {
        a: 1,
        b: 'something'
    };
    return x.b;
}
