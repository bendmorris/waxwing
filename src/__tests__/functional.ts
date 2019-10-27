import fs from 'fs';
import path from 'path';
import compile from '../compiler';

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

for (const testPath of globDir(path.join('tests', 'functional'), '.*\.in\.js')) {
    describe('functional tests', () => {
        test(`${testPath}`, () => {
            const out = compile(testPath);
            const check = fs.readFileSync(testPath.replace(/\.in\.js$/, '.out.js')).toString();
            expect(out).toMatch(check);
        });
    });
}
