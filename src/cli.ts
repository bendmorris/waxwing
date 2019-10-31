import program from 'commander';
import compile from './compiler';
import fs from 'fs';

program
    .name('waxwing')
    .arguments('input-file')
    .option('-o, --out <path>', 'output path')
    .option('-Os, --optimize-for-size', "if present, don't use optimizations that increase code size")
    .parse(process.argv);

const inputFile = program.args[0];
const result = compile(inputFile);
if (!program.out || program.out === '-') {
    console.log(result);
} else {
    fs.writeFileSync(program.out, result);
}
