export type LogicalValue = boolean | LogicalPredicate;
export type LogicalResult = boolean | undefined;
export type LogicalPredicate = () => LogicalResult;

export function solve(value: LogicalValue): LogicalResult {
    if (typeof value === 'function') {
        return value();
    }
    return value;
}

// export const isTrue: LogicalPredicate = (x) => x === true;
// export const isFalse: LogicalPredicate = (x) => x === false;
// export const isUndefined: LogicalPredicate = (x) => x === undefined;

export function not(predicate: LogicalPredicate): LogicalPredicate {
    return () => !(predicate());
}

export function or(lhs: LogicalPredicate, rhs: LogicalPredicate) {
    return any([lhs, rhs]);
}

export function and(lhs: LogicalPredicate, rhs: LogicalPredicate) {
    return all([lhs, rhs]);
}

export function xor(lhs: LogicalPredicate, rhs: LogicalPredicate) {
    const ps = [lhs, rhs];
    return and(any(ps), not(all(ps)));
}

export function any(predicates: LogicalPredicate[]): LogicalPredicate {
    return function() {
        let undef = false;
        for (const predicate of predicates) {
            const value = solve(predicate);
            if (value) {
                return true;
            } else if (value === undefined) {
                undef = true;
            }
        }
        return undef ? undefined : false;
    }
}

export function all(predicates: LogicalPredicate[]): LogicalPredicate {
    return function() {
        let undef = false;
        for (const predicate of predicates) {
            const value = solve(predicate);
            if (value === false) {
                return false;
            } else if (value === undefined) {
                undef = true;
            }
        }
        return undef ? undefined : true;
    }
}

export function none(predicates: LogicalPredicate[]): LogicalPredicate {
    return not(any(predicates));
}
