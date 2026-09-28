import { invalidValue } from "./errors.js";

// The backend stores bare dates at 12:00 in the user's timezone; relative
// words resolve against LUCAS_TZ or this machine's zone.
export function cliTimeZone(): string {
  return (
    process.env.LUCAS_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
}

function parts(date: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
}

export function localDateString(
  date: Date = new Date(),
  timeZone = cliTimeZone(),
): string {
  const p = parts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function formatLocalDateTime(
  value: unknown,
  timeZone = cliTimeZone(),
): string | undefined {
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const p = parts(date, timeZone);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const ISO_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

function isRealDate(year: string, month: string, day: string): boolean {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

export function parseDateOption(
  value: string | undefined,
  flag = "--date",
  now: Date = new Date(),
): string | undefined {
  if (value === undefined) return undefined;
  const input = value.trim();
  const word = input.toLowerCase();
  if (word === "today" || word === "hoy") return localDateString(now);
  if (word === "yesterday" || word === "ayer") {
    return localDateString(new Date(now.getTime() - DAY_MS));
  }
  const dateOnly = DATE_ONLY.exec(input) ?? LOCAL_DATE_TIME.exec(input);
  if (dateOnly && isRealDate(dateOnly[1], dateOnly[2], dateOnly[3])) {
    if (dateOnly.length === 4) return input;
    if (Number(dateOnly[4]) < 24 && Number(dateOnly[5]) < 60) return input;
  }
  if (ISO_WITH_OFFSET.test(input) && !Number.isNaN(Date.parse(input))) {
    return input;
  }
  throw invalidValue(`Invalid date for ${flag}: ${value}`, {
    accepted: [
      "today",
      "yesterday",
      "YYYY-MM-DD",
      "YYYY-MM-DDTHH:mm (local time)",
      "ISO 8601 with offset",
    ],
  });
}
