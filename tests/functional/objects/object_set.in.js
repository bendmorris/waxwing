/**
 * UNIMPLEMENTED: instance inlining
 *
 * This does not require a register because it can be inlined into its only
 * escape point.
 */
function f() {
    var x = {a: 1, b: 2};
    x.c = 3;
    return x;
}

console.log(f());
