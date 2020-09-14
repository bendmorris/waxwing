Your help with this project is appreciated!

## Contributing

TODO: add more guidelines here. Feel free to open an issue or PR for now.

## Areas to explore

Things that could use some attention:

* There are plenty of known issues. Currently functional tests are used to track these, so run `jest` and look for failing tests where the output is clearly not equivalent to what was expected. Sometimes these are caused by cutting corners to prototype something; these are indicated with a `// FIXME:` comment in the code.
* There are cases where a planned optimization is not in place or is not fully optimal yet; these are also captured in failing tests, where the output is functionally the same as what's expected, but longer or more complex.
* Finally, there's a lot of JS syntax that is not yet supported. This might require extending WWIR or finding a way to map it to existing constructs.
* We could always use more unit tests and documentation!

## Tests

I use Jest for both unit and functional testing. Unit tests should be placed in `__tests__` directories next to the source files.

For functional tests, see the "tests/functional" directory for examples. Creating a "X.in.js" file and "X.out.ww" (for unoptimized WWIR) and/or "X.out.js" (for final JS) will automatically generate tests comparing the compilation results with the expectation.

Please include tests for your PRs as much as possible. If you're fixing something reported as a Github issue, it's good to add a test called "issue1234.in.js" (using the Github issue number) and verify that it was broken before your fix, and passes afterward.
