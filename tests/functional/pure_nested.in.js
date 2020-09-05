function f() {
    function g() {
        var a = 1, b = 2;
        var c = a + b;
        return a;
    }
    return g();
}
