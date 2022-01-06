import { createLogger, format, transports } from "winston";

export const logger = createLogger({
  level: "info",
  format: format.combine(
    format.colorize(),
    format.simple(),
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "log.txt" }),
  ],
});
