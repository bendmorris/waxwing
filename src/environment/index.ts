export * from './symbolic';

import * as symbolic from './symbolic';
import * as browser from './browser';
import * as common from './common';
import * as empty from './empty';
import * as node from './node';

interface SymbolicEnvironment {
    environment: symbolic.SymbolicNamespace,
}

export const environments: Record<string, SymbolicEnvironment> = {
    browser,
    common,
    empty,
    node,
}
