function f() {
    var $_r0 = console.log;
    function g() {
        console.log("hello");
    }
  
    g();
  
    $_r0("now it's undefined");
    $_r0("now it's one");
}
