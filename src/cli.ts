#!/usr/bin/env node
import compile from './compiler';
import { makeOptions } from './options';
import fs from 'fs';
import process from 'process';
import yargs from 'yargs';

const args = yargs
    .scriptName('waxwing')
    .usage('$0 <cmd> [args]')
    .command('$0 <inputFile>', 'An optimizing JavaScript compiler', (yargs: yargs.Argv) =>
        yargs.positional('inputFile', {
            describe: "path to input file",
            type: 'string',
            required: true
        })
        .option('out', {
            alias: 'o',
            description: 'output path',
            type: 'string',
            default: '-'
        })
        .option('verbose', {
            alias: 'v',
            description: 'display verbose logs (can be repeated to increase verbosity)',
            type: 'boolean'
        })
        .count('verbose')
    )
    .help()
    .alias('help', 'h')
    .argv;

const options = makeOptions({
    input: args.inputFile as string,
    out: args.out as string,
    verbose: args.verbose as number,
});
const result = compile(options);
if (options.out === '-') {
    process.stdout.write(result);
} else {
    fs.writeFileSync(args.out as string, result);
}
