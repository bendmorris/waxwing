function f() {
    var common = a.b;
    var x = common.f1();
    var y = a.b.f2();
    var z = a.b.f3();
    var w = a.b.f4();
    return x + y + z + w;
}
