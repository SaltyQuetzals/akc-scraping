import * as log from "https://deno.land/std@0.106.0/log/mod.ts";

const argFormatter = (logRecord: log.LogRecord) => {
  let msg = `${logRecord.levelName} ${logRecord.msg}`;

  logRecord.args.forEach((arg, index) => {
    msg += `, arg${index}: ${arg}`;
  });

  return msg;
};

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG", {
      formatter: argFormatter,
    }),

    file: new log.handlers.FileHandler("DEBUG", {
      filename: "./log.txt",
      // you can change format of output message using any keys in `LogRecord`.
      formatter: argFormatter,
    }),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console", "file"],
    },
  },
});
export const logger = log.getLogger();
