#!/usr/bin/env node
import program from 'commander';
import compile from './compiler';
import { makeOptions } from './options';
import fs from 'fs';

program
    .name('waxwing')
    .arguments('input-file')
    .option('-o, --out <path>', 'output path')
    .option('-Os, --optimize-for-size', "if present, don't use optimizations that increase code size")
    .option('--debug', "adds verbose debugging output")
    .parse(process.argv);

const inputFile = program.args[0];
const options = makeOptions({
    input: inputFile,
    out: program.out,
    optimizeForSize: program.optimizeForSize,
    debug: program.debug,
});
const result = compile(options);
if (options.out === '-') {
    console.log(result);
} else {
    fs.writeFileSync(program.out, result);
}
