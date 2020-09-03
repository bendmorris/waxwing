/**
 * This directory contains definitions for WWIR, the Waxwing Intermediate
 * Representation.
 *
 * Waxwing compiles JavaScript into WWIR, which features Static Single
 * Assignment. This makes it easier to optimize and identify things like common
 * subexpressions and dead code.
 */

export * from './block';
export * from './constraint';
export * from './effect';
export * from './expr';
export * from './function';
export * from './lvalue';
export * from './program';
export * from './stmt';
export * from './utils';