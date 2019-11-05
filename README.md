![Waxwing logo](https://raw.githubusercontent.com/bendmorris/waxwing/master/assets/waxwing-128.png)

```
                   .-.
                  /'v'\
                 (/   \)
                ='="="===<
                   |_|

 _    _                      _             
| |  | |                    (_)            
| |  | | __ ___  ____      ___ _ __   __ _ 
| |/\| |/ _` \ \/ /\ \ /\ / / | '_ \ / _` |
\  /\  / (_| |>  <  \ V  V /| | | | | (_| |
 \/  \/ \__,_/_/\_\  \_/\_/ |_|_| |_|\__, |
                                      __/ |
                                     |___/ 
```

Waxwing is an optimizing JavaScript compiler. This is a **work in progress** and is not ready to be used!

## Install

Check out the repo, and run the following commands:

```shell
npm install
npm run build
sudo npm link
```

## Usage

```shell
waxwing myFile.js
```

## What does Waxwing do?

Waxwing optimizes JavaScript to reduce file size and/or improve execution time.

Waxwing occupies a space between minifiers and tools like closure compiler/prepack:

- Minifiers generally attempt only local optimizations; Waxwing tracks execution state and will execute code where possible, so it's capable of more complex optimizations.
- Closure compiler and prepack impose heavy constraints on your code and require modeling to optimize. This makes them difficult to introduce into large, complex code bases. Waxwing does "best effort" optimization of code as-is (and support for feeding it more information via TypeScript type definitions is planned) and should work out of the box with any code base that meets some common assumptions listed below.

Some examples of optimizations Waxwing will attempt:

- Simplifies expressions via partial evaluation. While many minifiers do this as a "peephole optimization" (e.g. `1 + 1` => `2`), Waxwing will take the partial execution context into account (e.g. `{var x = 1; console.log(x + 5);}` => `console.log(6)`.)
- Aggressive dead code elimination (DCE). Beyond what is done by typical minifiers, Waxwing will eliminate dead declarations (variables or functions whose values aren't needed after optimization.)
- Function inlining. Waxwing will use a configurable heuristic to decide whether to inline functions at build time where possible.

## Assumptions

JavaScript is very dynamic; some optimizations rely on assumptions about the way you use JavaScript. These constraints should hold for the vast majority of JS code:

- Don't overwrite built-in property methods with new versions that break the original contract.
- Don't use `eval` to dynamically introduce or modify variables. You *can* use `eval` to return an expression (Waxwing will treat this as an unknown value) but variable references inside the `eval` code will *not* be considered by Waxwing, so values used can be collected during DCE.
- Functions defined with `new Function` are not eligible for any optimizations relying on function introspection; they can't be inlined, etc.
