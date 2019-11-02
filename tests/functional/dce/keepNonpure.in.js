{
    function sideEffects() {
        console.log("this has a side effect");
        return true;
    }
    var x = sideEffects();
}
