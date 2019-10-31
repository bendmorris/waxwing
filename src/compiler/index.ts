import { Ast } from '../ast';
import { ExecutionContext } from './context';
import { parseFile } from '../parser';
import serialize from '../serialize';

export default function compile(input: string | Ast): string {
    if (typeof input === 'string') {
        input = parseFile(input);
    }
    const context = new ExecutionContext();
    const result = context.compile(input);
    return serialize(result);
}
