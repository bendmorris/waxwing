import * as symbolic from './symbolic';
import * as common from './common';

export const environment = common.environment.copy();
environment.define('console', symbolic.value());
