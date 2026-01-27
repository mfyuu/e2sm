import type { ArgSchema, ArgToken } from "gunshi";
import { cyan, dim, gray, green } from "kleur/colors";
import { spawn } from "node:child_process";

export function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Validates that all provided flags are known options.
 * @returns Error message if an unknown flag is found, null otherwise
 */
export function validateUnknownFlags(
  tokens: ArgToken[],
  args: Record<string, ArgSchema>,
): string | null {
  // Build set of known option names
  const knownOptions = new Set<string>();

  // Built-in options
  knownOptions.add("help");
  knownOptions.add("h");
  knownOptions.add("version");
  knownOptions.add("v");

  // User-defined options
  for (const [key, schema] of Object.entries(args)) {
    knownOptions.add(key);
    knownOptions.add(toKebabCase(key));

    if (schema.short) {
      knownOptions.add(schema.short);
    }
  }

  // Check for unknown options
  for (const token of tokens) {
    if (token.kind === "option" && token.name) {
      // Handle --no- prefix for negatable options
      const name = token.name.startsWith("no-") ? token.name.slice(3) : token.name;

      if (!knownOptions.has(name)) {
        return `Unknown option: --${token.name}`;
      }
    }
  }

  return null;
}

/**
 * Determines if template mode is active.
 */
export function isTemplateMode(flags: {
  template?: boolean;
  application?: string;
  stage?: string;
}): boolean {
  return Boolean(flags.template || flags.application || flags.stage);
}

/**
 * Validates that --name flag is not used with template mode flags.
 */
export function validateNameTemplateConflict(flags: {
  name?: string;
  template?: boolean;
  application?: string;
  stage?: string;
}): string | null {
  if (flags.name && isTemplateMode(flags)) {
    const conflicting: string[] = [];
    if (flags.template) conflicting.push("--template");
    if (flags.application) conflicting.push("--application");
    if (flags.stage) conflicting.push("--stage");
    return `Cannot use --name with ${conflicting.join(", ")}`;
  }
  return null;
}

export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    // Check if value is quoted
    const isQuoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));

    // Remove surrounding quotes if present
    if (isQuoted) {
      value = value.slice(1, -1);
    } else {
      // Remove inline comment for unquoted values
      const commentIndex = value.indexOf("#");
      if (commentIndex !== -1) {
        value = value.slice(0, commentIndex).trim();
      }
    }

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

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

export function exec(
  command: string,
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

export function formatJson(obj: unknown, indent = 0): string {
  const spaces = "  ".repeat(indent);

  if (obj === null) {
    return gray("null");
  }

  if (typeof obj === "string") {
    return green(`"${obj}"`);
  }

  if (typeof obj === "number" || typeof obj === "boolean" || typeof obj === "bigint") {
    return String(obj);
  }

  if (typeof obj === "undefined") {
    return gray("undefined");
  }

  if (typeof obj === "symbol") {
    return gray(obj.toString());
  }

  if (typeof obj === "function") {
    return gray("[Function]");
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return dim("[]");
    const items = obj.map((item) => `${spaces}  ${formatJson(item, indent + 1)}`);
    return `${dim("[")}\n${items.join(`${dim(",")}\n`)}\n${spaces}${dim("]")}`;
  }

  // obj is now narrowed to object (non-null, non-array)
  const entries = Object.entries(obj);
  if (entries.length === 0) return dim("{}");
  const items = entries.map(
    ([key, value]) => `${spaces}  ${cyan(`"${key}"`)}${dim(":")} ${formatJson(value, indent + 1)}`,
  );
  return `${dim("{")}\n${items.join(`${dim(",")}\n`)}\n${spaces}${dim("}")}`;
}

export interface SecretListEntry {
  Name: string;
  ARN: string;
}

export interface SecretListResponse {
  SecretList: SecretListEntry[];
}

/**
 * Fetches the list of secrets from AWS Secrets Manager.
 */
export async function fetchSecretList(options: {
  profile?: string;
  region?: string;
}): Promise<{ secrets: SecretListEntry[] } | { error: string }> {
  const profileArgs = options.profile ? ["--profile", options.profile] : [];
  const regionArgs = options.region ? ["--region", options.region] : [];

  const result = await exec("aws", [
    "secretsmanager",
    "list-secrets",
    ...profileArgs,
    ...regionArgs,
  ]);

  if (result.exitCode !== 0) {
    return { error: result.stderr };
  }

  const response: SecretListResponse = JSON.parse(result.stdout);
  return { secrets: response.SecretList };
}

/**
 * Converts JSON object to .env format string.
 */
export function jsonToEnv(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([key, value]) => {
      const escaped = value.replace(/"/g, '\\"');
      return `${key}="${escaped}"`;
    })
    .join("\n");
}

export function generateEnvHeader(secretName: string): string {
  return `# Generated by e2sm\n# Source: ${secretName}`;
}
