![Waxwing logo](https://raw.githubusercontent.com/bendmorris/waxwing/master/assets/waxwing-128.png)

Waxwing is an optimizing JavaScript source-to-source compiler - a compiler that takes JS as input, and outputs optimized JS. This is a **work in progress** and is not ready to be used!

While Waxwing can produce compact output, it is not a minifier. You should run Waxwing first, and then minify the resulting output.

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
function f(){var x=1,y=2+x++;return 3+ ++y}

$ closure-compiler --js tests/functional/update_expr.in.js
function f(){var a=1,a=a++ +2;return++a+3};

$ waxwing tests/functional/update_expr.in.js -c
function f(){return 7;}
```
