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
 * Loads config from .e2smrc.json (project or global).
 * Returns empty object if no config found.
 */
export async function loadConfig(): Promise<E2smConfig> {
  const { homedir } = await import("node:os");
  const { join } = await import("node:path");
  const { readFile } = await import("node:fs/promises");

  const candidates = [join(process.cwd(), ".e2smrc.json"), join(homedir(), ".e2smrc.json")];

  for (const filePath of candidates) {
    try {
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      // ignore errors (file not found, parse errors), continue to next
    }
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
