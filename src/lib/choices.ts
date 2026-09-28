import { InvalidArgumentError } from "commander";

export function choice(values: readonly string[]): (value: string) => string {
  return (value: string) => {
    const wanted = value.trim().toLowerCase();
    const match = values.find((allowed) => allowed.toLowerCase() === wanted);
    if (!match) throw new InvalidArgumentError(`Use ${values.join(", ")}.`);
    return match;
  };
}
