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

## How does it work?

At a high level, Waxwing converts JS into a language called WWIR, optimizes that, and generates new JS from the optimized WWIR.

### WWIR

Waxwing uses Babel to parse JavaScript, and converts the JavaScript AST into an [intermediate representation](https://en.wikipedia.org/wiki/Intermediate_representation) called WWIR (three guesses what that stands for.) WWIR is an assembly-like language; [see an example of it here](https://github.com/bendmorris/waxwing/blob/master/tests/functional/controlFlow/dce_break_continue.out.ww) (compare the original [JS](https://github.com/bendmorris/waxwing/blob/master/tests/functional/controlFlow/dce_break_continue.in.js)).

WWIR has a few properties which make it convenient to analyze and optimize:

- [Static Single Assignment](https://en.wikipedia.org/wiki/Static_single_assignment_form): WWIR "variables" (called "temps") are not reassignable; they can only be defined once, like a `const` in JS. This is a nice property because you don't need to track potential mutations to the variable.

- The code is broken into [basic blocks](https://en.wikipedia.org/wiki/Basic_block). A basic block contains only statements, with no [jumps](https://en.wikipedia.org/wiki/Branch_(computer_science)) until the end of the block. Basically this means that, if you execute one statement in a block, you know you'll execute all of them.

- Expressions use [three-address code](https://en.wikipedia.org/wiki/Three-address_code). This means that complex expressions have to be decomposed; to represent `x = 1 + 2 + 3` you would need `x1 = 1 + 2; x2 = x1 + 3`. This decomposition is helpful to identify common subexpressions or dead code. When we generate JS we'll inline the subexpressions whenever possible, so our output doesn't have this many variables.

### Optimization

In "src/compiler/optimize" you can find examples of optimization passes. Optimizations implement a visitor and can operate on each statement, block, function (containing a set of connected blocks) or the entire program, whatever's most appropriate for that pass.
