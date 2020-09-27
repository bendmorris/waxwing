/**
 * UNIMPLEMENTED: phi
 *
 * `phi` is unimplemented. Eventually we will know that `x` can be either 1 or
 * 2 by the time we reach the condition `x < 3` and in both cases will be
 * true, eliminating the branch. `x` will still exist.
 *
 * As a stretch goal we can collapse x into a ternary since its `phi`
 * candidates are either the original value, or a value from a branch that does
 * nothing else.
 */
function f() {
    var x = 1;
    if (someCondition) {
        x = 2;
    }
    if (x < 3) {
        console.log("yes!");
    }
    return x;
}
