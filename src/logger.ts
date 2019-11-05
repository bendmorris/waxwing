export const enum LogLevel {
    Log = 1,
    Info = 2,
    Chatty = 3
}

export default class Logger {
    verbose: number;

    constructor(verbose: number) {
        this.verbose = verbose;
    }

    debugLog(level, ...args) {
        if (this.verbose >= level) {
            // if the first argument is an AST node, log its source position, not the whole node
            if (typeof args[0] === 'object' && typeof args[0].loc === 'object') {
                const loc = args[0].loc;
                args[0] = `${loc.start.line}:${loc.start.column}-${loc.end.line}:${loc.end.column}:`;
            }
            console.warn(...args);
        }
    }

    log(...args) {
        this.debugLog(LogLevel.Log, ...args);
    }

    info(...args) {
        this.debugLog(LogLevel.Info, ...args);
    }

    chatty(...args) {
        this.debugLog(LogLevel.Chatty, ...args);
    }
}