/**
 * UNIMPLEMENTED: pure function inlining/elimination
 *
 * Because `g` is a pure function, we can infer its return value, inline it,
 * and eliminate the function.
 */
function f() {
    function g() {
        var a = 1, b = 2;
        var c = a + b;
        return a;
    }
    return g();
}

console.log(f());
