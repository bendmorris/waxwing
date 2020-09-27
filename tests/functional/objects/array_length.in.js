/**
 * UNIMPLEMENTED: array length handling
 *
 * Because we know the length of `a`` at this point, we can statically evaluate
 * `a.length`; branch elimination then eliminates the entire if statement.
 */
function f() {
    var a = [1, 2, 3];
    if (a.length - 3) {
        console.log("HI!");
    }
}
