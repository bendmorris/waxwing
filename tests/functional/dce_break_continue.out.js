function f() {
    while (inscrutableGlobal) {
        console.log("hello");
        if (inscrutableGlobal2) {
            break;
        }
    }
    do {
        console.log("hello");
        if (inscrutableGlobal4) {
            continue;
        }
    } while (inscrutableGlobal3);
}
