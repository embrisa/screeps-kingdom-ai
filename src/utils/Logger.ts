// src/utils/Logger.ts

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
  NONE = 5,
}

const logLevelToColor: { [key in LogLevel]?: string } = {
  [LogLevel.DEBUG]: 'gray',
  [LogLevel.INFO]: 'white',
  [LogLevel.WARN]: 'yellow',
  [LogLevel.ERROR]: 'red',
  [LogLevel.FATAL]: 'red',
};

function getLogLevel(): LogLevel {
  return Memory.logLevel !== undefined ? Memory.logLevel : LogLevel.INFO;
}

function color(str: string, color: string): string {
  return `<span style="color:${color}">${str}</span>`;
}

function log(level: LogLevel, message: string, ...args: unknown[]) {
  if (level < getLogLevel()) {
    return;
  }

  const colorStr = logLevelToColor[level] || 'white';
  const tick = color(`[${Game.time}]`, 'gray');
  const output = `${tick} ${color(message, colorStr)}`;

  console.log(output, ...args);
}

export const Logger = {
  debug: (message: string, ...args: unknown[]) => log(LogLevel.DEBUG, message, ...args),
  info: (message: string, ...args: unknown[]) => log(LogLevel.INFO, message, ...args),
  warn: (message: string, ...args: unknown[]) => log(LogLevel.WARN, message, ...args),
  error: (message: string, ...args: unknown[]) => log(LogLevel.ERROR, message, ...args),
  fatal: (message: string, ...args: unknown[]) => log(LogLevel.FATAL, message, ...args),
};
