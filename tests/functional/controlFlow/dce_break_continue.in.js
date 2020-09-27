/**
 * UNIMPLEMENTED: better common subexpression handling
 *
 * Since `console.log` is shared by both `while` blocks, they have a common
 * ancestor, and `console.log` is not written by that block or any in between,
 * we can create a temp for `console.log` in the ancestor and reference it in
 * both loops.
 */
function f() {
    while (inscrutableGlobal) {
        console.log("hello");
        if (inscrutableGlobal2) {
            break;
            console.log("unreachable");        
        }
    }

    do {
        console.log("hello");
        if (inscrutableGlobal4) {
            continue;
            console.log("unreachable");
        }
    } while (inscrutableGlobal3);
}
