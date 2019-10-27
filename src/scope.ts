import { Binding } from './binding';

export default class Scope extends Map<string, Binding> {
    static resolve(name: string, scopes: Scope[]): Binding | undefined {
        for (let i = scopes.length - 1; i >= 0; --i) {
            if (scopes[i].has(name)) {
                return scopes[i].get(name);
            }
        }
        return;
    }
}
