function f() {
    var $_r0 = console.log;
    while (inscrutableGlobal) {
        $_r0("hello");
        if (inscrutableGlobal2) {
            break;
        }
    }
    do {
        $_r0("hello");
        if (inscrutableGlobal4) {
            continue;
        }
    } while (inscrutableGlobal3);
}
