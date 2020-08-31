import fs from 'fs';
import path from 'path';
import { irCompile } from '../compiler/compile';
import { parseFile } from '../ast';

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

describe('WWIR compilation tests', () => {
    for (const testPath of globDir(path.join('tests', 'ir'), '.*\.in\.js')) {
        test(`${testPath.substr('tests/ir/'.length)}`, () => {
            const ast = parseFile(testPath);
            const out = irCompile(ast).toString();
            const check = fs.readFileSync(testPath.replace(/\.in\.js$/, '.out.ww')).toString();
            expect(out).toEqual(check);
        });
    }
});
