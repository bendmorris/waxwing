import fs from 'fs';
import path from 'path';
import { parseFile } from '../ast';
import { compile } from '../compiler';
import { irCompile } from '../compiler/compile';
import { Options, makeOptions } from '../options';
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
                test(`${testPath} -> JS`, () => {
                    // TODO: overridable options
                    const options: Options = makeOptions({
                        input: testPath,
                    });
                    const out = normalize(compile(options));
                    const check = normalize(fs.readFileSync(outFile).toString());
                    expect(out).toEqual(check);
                });
            }
        }
    }
});
