/**
 * UNIMPLEMENTED: common subexpressions across blocks
 *
 * `console.log` is used in multiple blocks and even a different function. It
 * should be replaced with a single temp.
 */
function f() {
    g();

    if (x === undefined) {
        console.log("now it's undefined");
    }

    var x = 1;

    if (x === 1) {
        console.log("now it's one");
    }

    function g() {
        console.log("hello");
    }
}
