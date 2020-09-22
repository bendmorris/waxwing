function f() {
    while (inscrutableGlobal) {
        console.log("hello");
        if (inscrutableGlobal2) {
            break;
            console.log("unreachable");        
        }
    }

    do {
        console.log("hello");
        if (inscrutableGlobal4) {
            continue;
            console.log("unreachable");
        }
    } while (inscrutableGlobal3);
}
