Functional tests in this directory test a known input against an expected output.

Test files end with ".in.js" and are expected to match the corresponding ".out.js" file.

Using a stateful or unknown function (like `console.log`) in tests is a good practice to avoid dead code elimination.
