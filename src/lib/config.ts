import { type ParseError, parse, printParseErrorCode } from "jsonc-parser";

export interface E2smConfig {
  template?: boolean;
  application?: string;
  stage?: string;
  profile?: string;
  region?: string;
  input?: string;
  output?: string;
  name?: string;
}

/**
 * Loads config from .e2smrc.jsonc or .e2smrc.json (project or global).
 * Searches in order: .jsonc (preferred) then .json (backward compatibility).
 * Returns empty object if no config found.
 */
export async function loadConfig(): Promise<E2smConfig> {
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const { readFile } = await import("node:fs/promises");

  const candidates = [
    join(process.cwd(), ".e2smrc.jsonc"),
    join(process.cwd(), ".e2smrc.json"),
    join(homedir(), ".e2smrc.jsonc"),
    join(homedir(), ".e2smrc.json"),
  ];

  for (const filePath of candidates) {
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      // File not found, try next candidate
      continue;
    }

    const errors: ParseError[] = [];
    const config = parse(content, errors, { allowTrailingComma: true });

    if (errors.length > 0) {
      const errorMessages = errors.map((e) => printParseErrorCode(e.error)).join(", ");
      console.warn(`Warning: Parse error in ${filePath}: ${errorMessages}`);
      console.warn("Skipping this config file and trying next candidate...");
      continue;
    }

    return config;
  }

  return {};
}

/**
 * Merges CLI flags with config. CLI takes precedence.
 */
export function mergeWithConfig(cliValues: Partial<E2smConfig>, config: E2smConfig): E2smConfig {
  return {
    ...config,
    ...Object.fromEntries(Object.entries(cliValues).filter(([, v]) => v !== undefined)),
  };
}
