function f() {
    var x = {a: 1, b: 2, c: 3};
    console.log(x);
    x.d = 4;
    return x;
}

console.log(f());
