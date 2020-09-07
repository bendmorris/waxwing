function f() {
    while (true) {
        log("loop body 1");
        break;
    }

    while (true || false) {
        log("loop body 2");
        continue;
    }

    do {
        log("loop body 3");
    } while (true && false);
}