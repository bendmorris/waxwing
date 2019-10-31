import { Value } from './value';

export default class Scope extends Map<string, Value> {
    static resolve(name: string, scopes: Scope[]): Value | undefined {
        for (let i = scopes.length - 1; i >= 0; --i) {
            if (scopes[i].has(name)) {
                return scopes[i].get(name);
            }
        }
        return;
    }
}
