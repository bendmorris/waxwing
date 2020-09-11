function f() {
    while (something) {
        log("loop body 1");
        if (somethingElse) {
            break;
        }
    }

    while (true || false) {
        log("loop body 2");
        if (somethingElse) {
            continue;
        }
    }

    do {
        log("loop body 3");
    } while (true && false);
}
