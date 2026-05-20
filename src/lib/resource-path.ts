const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

export function safePathSegment(value: string, label = "resource id"): string {
  const segment = value.trim();

  if (!segment) {
    throw new Error(`Invalid ${label}: value is required`);
  }

  if (!SAFE_SEGMENT.test(segment)) {
    throw new Error(
      `Invalid ${label}: use only letters, numbers, underscores, or hyphens`,
    );
  }

  return segment;
}

export function resourcePath(
  basePath: string,
  id: string,
  ...suffixes: string[]
): string {
  const normalizedBase = basePath.replace(/\/+$/, "");
  const path = [normalizedBase, safePathSegment(id), ...suffixes].join("/");
  return path;
}
