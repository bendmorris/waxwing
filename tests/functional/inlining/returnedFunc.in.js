{
    function f(y) {
        return function g(x) {
            return x + y;
        }
    }

    console.log(f(2)(3));
}
