#!/usr/bin/env node
require('colors');
import { compile } from './compiler';
import { makeOptions } from './options';
import { environments } from './environment';
import * as log from './log';
import fs from 'fs';
import process from 'process';
import yargs from 'yargs';

const args = yargs
    .scriptName('waxwing')
    .usage('$0 <cmd> [args]')
    .command('$0 <inputFile>', (`
.                    .-.
.                   /'v'\\
.                  (/   \\)
.                 ='="="===<
.                    |_|
.` as any).yellow.bold + (`
.  _    _                      _
. | |  | |                    (_)
. | |  | | __ ___  ____      ___ _ __   __ _
. | |/\\| |/ _' \\ \\/ /\\ \\ /\\ / / | '_ \\ / _' |
. \\  /\\  / (_| |>  <  \\ V  V /| | | | | (_| |
.  \\/  \\/ \\__,_/_/\\_\\  \\_/\\_/ |_|_| |_|\\__, |
.                                       __/ |
.                                      |___/
` as any).green.bold + (`
Waxwing, an optimizing JavaScript compiler.
` as any).cyan.bold, (yargs: yargs.Argv) =>
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
        .option('compact', {
            alias: 'c',
            description: 'generate compact code',
            type: 'boolean',
        })
        .option('ir', {
            description: 'output WWIR instead of JS',
            type: 'boolean',
        })
        .option('env', {
            description: 'intended execution environment of the output code',
            type: 'string',
            choices: Object.keys(environments),
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
    outputIr: args.ir as boolean,
    compact: args.compact as boolean,
});

log.setLogLevel(options.verbose as log.LogLevel);

const result = compile(options);

if (options.out === '-') {
    process.stdout.write(result);
} else {
    fs.writeFileSync(args.out as string, result);
}
