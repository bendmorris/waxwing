import program from 'commander';
import compile from './compiler';
import fs from 'fs';

program
    .name('waxwing')
    .arguments('input-file')
    .option('-o, --out <path>', 'output path')
    .parse(process.argv);

const inputFile = program.args[0];
const result = compile(inputFile);
if (!program.out || program.out === '-') {
    console.log(result);
} else {
    fs.writeFileSync(program.out, result);
}
