import { stderr, uptime } from 'process';
require('colors');

export enum LogLevel {
    Error,
    Warning,
    Info,
    Debug
}

let logLevel: LogLevel = LogLevel.Warning;
export function setLogLevel(level: LogLevel) {
    logLevel = level;
} 

const levelNames = ['ERR', 'WRN', 'INF', 'DBG'];
const levelColors: ((string) => any)[] = [
    (x) => x.red,
    (x) => x.yellow,
    (x) => x.cyan,
    (x) => x.blue,
]

function formatTime(t) {
    const h = Math.round(t / 3600);
    const m = Math.round((t % 3600) / 60);
    const s = Math.round(t % 60);
    const frac = t % 1;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${frac.toFixed(3).substr(1)}`;
}

type LogMsg = string | (() => string);
export function log(level: LogLevel, msg: LogMsg, extra?: LogMsg) {
    if (logLevel >= level) {
        const txt = typeof msg === 'function' ? msg() : msg;
        const c = levelColors[level]
        stderr.write(c(`[${formatTime(uptime())}] ${levelNames[level]}: `).bold + c(txt).bold + '\n');
        if (extra) {
            const txt2 = typeof extra === 'function' ? extra() : extra;
            stderr.write(c(txt2) + '\n');
        }
    }
}

export function logError(x, extra) { log(LogLevel.Error, x, extra); }
export function logWarning(x, extra) { log(LogLevel.Warning, x, extra); }
export function logInfo(x, extra) { log(LogLevel.Info, x, extra); }
export function logDebug(x, extra) { log(LogLevel.Debug, x, extra); }
