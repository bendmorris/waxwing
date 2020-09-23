function f() {
    while (something) {
        log("loop body 1");

        if (somethingElse) {
            break;
        }
    }

    while (true) {
        log("loop body 2");

        if (somethingElse) {
            continue;
        }
    }

    log("loop body 3");
}
