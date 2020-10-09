import * as ir from "../../ir";
import { ResolvedName } from './scope';

export function nameToString(n: ResolvedName) {
    return `${n.scope.id}:${n.name}`;
}

export type Bindings = Record<string, ir.TempVar>;
