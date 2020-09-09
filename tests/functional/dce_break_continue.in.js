function f() {
    while (true) {
        console.log("hello");
        break;
        console.log("unreachable");        
    }

    do {
        console.log("hello");
        continue;
        console.log("unreachable");        
    } while (false);
}
