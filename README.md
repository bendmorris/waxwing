![Waxwing logo](https://raw.githubusercontent.com/bendmorris/waxwing/master/assets/waxwing-128.png)

Waxwing is an optimizing JavaScript source-to-source compiler - a compiler that takes JS as input, and outputs optimized JS. This is a **work in progress** and is not ready to be used!

Waxwing does things like:

* Function inlining: get rid of unnecessary function calls and declarations.
* Common subexpression elimination: use temporary variables to eliminate redundancy.
* Branch and dead code elimination: eliminate code that is unreachable, and loops/conditions that aren't necessary.
* Constant propagation: replace code with its statically known value
* Partial evaluation: simplify expressions as much as possible at compile time

While Waxwing can produce compact output with `-c`, it is not a minifier and does not specifically optimize for code size (although its heuristics do consider code size.) You should run Waxwing first, and then minify the resulting output with something like [Terser](https://github.com/terser/terser).

## Setup

To build:

```
npm install
npm link
npm run build
```

To run tests:

```
jest
```

## Usage

To compile a file:

```
waxwing path/to/script.js
```

Run `waxwing --help` for more usage information.

## Hey, lookee here

```
$ terser tests/functional/update_expr.in.js -c
function f(){var x=1,y=2+x++;return 2+ ++y+3}

$ closure-compiler --js tests/functional/update_expr.in.js
function f(){var a=1,b=a++ +2;return a+ ++b+3};

$ waxwing tests/functional/update_expr.in.js -c
function f(){return 9;}
```
