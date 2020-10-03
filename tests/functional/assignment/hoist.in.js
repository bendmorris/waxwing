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
