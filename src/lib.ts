import type { ArgSchema, ArgToken } from "gunshi";

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
