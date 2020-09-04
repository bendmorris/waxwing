import fs from 'fs';
import path from 'path';
import { compile } from '../compiler';
import { Options, makeOptions } from '../options';

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

function normalize(s) {
    return s.replace(/\n+/g, '\n').replace(/ +/g, ' ');
}

/**
 * This automatically generates test cases for files in tests/functional/ which
 * verify the compilation end-to-end.
 *
 * Input: X.in.js
 * Expected JS output: X.out.js
 */
describe('functional tests', () => {
    for (const testPath of globDir(path.join('tests', 'functional'), '.*\.in\.js')) {
        test(`${testPath.substr('tests/functional/'.length)}`, () => {
            // TODO: overridable options
            const options: Options = makeOptions({
                input: testPath,
            });
            const out = normalize(compile(options));
            const check = normalize(fs.readFileSync(testPath.replace(/\.in\.js$/, '.out.js')).toString());
            expect(out).toEqual(check);
        });
    }
});
