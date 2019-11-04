{
    function sideEffects() {
        console.log("this has a side effect");
        return true;
    }
    function noSideEffects() {
        return false;
    }
    var x = sideEffects();
    var y = noSideEffects();
}
