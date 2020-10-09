import fs from 'fs';
import path from 'path';
import { parseFile } from '../ast';
import { compile } from '../compiler';
import { irCompile } from '../compiler/compile';
import { Options, makeOptions } from '../options';
import * as util from 'util';
const { js: beautify } = require('js-beautify');

function globDir(dir: string, pattern: string): string[] {
    let results = [];
    fs.readdirSync(dir).forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(globDir(filePath, pattern));
        } else if (file.match(pattern)) {
            results.push(filePath);
        }
    });
    return results;
}

const commentPattern = /\/\/.*|\/\*[^]*\*\//g;

function normalize(s) {
    return beautify(
        s.replace(commentPattern, ''),
        { preserve_newlines: false }
    );
}

/**
 * This automatically generates test cases for files in tests/functional/ which
 * verify specific stages of compilation.
 *
 * Input: X.in.js
 * Expected WWIR output: X.out.ww
 * Expected JS output: X.out.js
 */
describe('functional tests: JS -> WWIR', () => {
    for (const testPath of globDir(path.join('tests', 'functional'), '.*.in.js')) {
        // WWIR
        {
            const outFile = testPath.replace(/\.in\.js$/, '.out.ww');
            if (fs.existsSync(outFile)) {
                test(`${testPath} -> WWIR`, () => {
                    const ast = parseFile(testPath);
                    const out = irCompile(ast).toString();
                    const check = fs.readFileSync(outFile).toString();
                    expect(out).toEqual(check);
                });
            }
        }
    }
});

describe('functional tests: JS -> JS', () => {
    for (const testPath of globDir(path.join('tests', 'functional'), '.*.in.js')) {
        // JS
        {
            const outFile = testPath.replace(/\.in\.js$/, '.out.js');
            if (fs.existsSync(outFile)) {
                function compare() {
                    const options: Options = makeOptions({
                        input: testPath,
                    });
                    const out = normalize(compile(options));
                    const check = normalize(fs.readFileSync(outFile).toString());
                    return [out, check];
                }

                let out, check, err;
                try {
                    [out, check] = compare();
                } catch (e) {
                    err = e;
                }

                test(`${testPath}: compile`, () => {
                    if (err) {
                        throw err;
                    }
                    expect(out.length === 0).toEqual(check.length === 0);
                });

                test(`${testPath}: JS output`, () => {
                    if (err) {
                        throw err;
                    }
                    expect(out).toEqual(check);
                });
                if (!err && (out.indexOf('console.log') !== -1 || check.indexOf('console.log') !== -1)) {
                    test(`${testPath}: program stdout`, () => {
                        if (err) {
                            throw err;
                        }
                        function getOutput(x) {
                            let out = '';
                            let err;
                            const console = {
                                log: function (fmt, ...args: any[]) {
                                    out += util.format(fmt, ...args) + '\n';
                                }
                            }
                            console;
                            try {
                                eval(x);
                            } catch (e) {
                                err = e;
                            }
                            return [out, err];
                        }
                        const [out1, err1] = getOutput(out);
                        const [out2, err2] = getOutput(check);
                        expect(out1).toEqual(out2);
                        expect(err1).toEqual(err2);
                    });
                };
            }
        }
    }
});
