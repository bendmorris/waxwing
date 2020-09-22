function f() {
    var a = { x: 1, y: 2 };
    var b = { x: 3, y: 4 };
    var c = { x: a, y: b };
    b.z = c;
    globalFunc(a);
}
