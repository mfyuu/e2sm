import type { ArgSchema, ArgToken } from "gunshi";
import { describe, expect, test } from "bun:test";
import {
  exec,
  generateEnvHeader,
  isTemplateMode,
  jsonToEnv,
  mergeWithConfig,
  parseEnvContent,
  toKebabCase,
  validateNameTemplateConflict,
  validateUnknownFlags,
} from "./lib";

describe("toKebabCase", () => {
  test("converts camelCase to kebab-case", () => {
    expect(toKebabCase("dryRun")).toBe("dry-run");
  });

  test("converts multiple uppercase letters", () => {
    expect(toKebabCase("thisIsATest")).toBe("this-is-atest");
  });

  test("leaves already lowercase string unchanged", () => {
    expect(toKebabCase("lowercase")).toBe("lowercase");
  });

  test("leaves already kebab-case string unchanged", () => {
    expect(toKebabCase("already-kebab")).toBe("already-kebab");
  });

  test("handles single word", () => {
    expect(toKebabCase("word")).toBe("word");
  });

  test("handles empty string", () => {
    expect(toKebabCase("")).toBe("");
  });
});

describe("parseEnvContent", () => {
  test("parses basic KEY=value", () => {
    expect(parseEnvContent("FOO=bar")).toEqual({ FOO: "bar" });
  });

  test("parses multiple KEY=value pairs", () => {
    const content = `FOO=bar
BAZ=qux`;
    expect(parseEnvContent(content)).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  test("parses double-quoted values", () => {
    expect(parseEnvContent('FOO="bar baz"')).toEqual({ FOO: "bar baz" });
  });

  test("parses single-quoted values", () => {
    expect(parseEnvContent("FOO='bar baz'")).toEqual({ FOO: "bar baz" });
  });

  test("preserves hash in double-quoted values", () => {
    expect(parseEnvContent('FOO="bar#baz"')).toEqual({ FOO: "bar#baz" });
  });

  test("preserves hash in single-quoted values", () => {
    expect(parseEnvContent("FOO='bar#baz'")).toEqual({ FOO: "bar#baz" });
  });

  test("removes inline comment from unquoted values", () => {
    expect(parseEnvContent("FOO=bar # this is a comment")).toEqual({ FOO: "bar" });
  });

  test("skips empty lines", () => {
    const content = `FOO=bar

BAZ=qux`;
    expect(parseEnvContent(content)).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  test("skips comment lines", () => {
    const content = `# This is a comment
FOO=bar
# Another comment
BAZ=qux`;
    expect(parseEnvContent(content)).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  test("skips lines without equal sign", () => {
    const content = `FOO=bar
invalid line
BAZ=qux`;
    expect(parseEnvContent(content)).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  test("handles value with equal sign", () => {
    expect(parseEnvContent("FOO=bar=baz")).toEqual({ FOO: "bar=baz" });
  });

  test("trims whitespace around key and value", () => {
    expect(parseEnvContent("  FOO  =  bar  ")).toEqual({ FOO: "bar" });
  });

  test("handles empty value", () => {
    expect(parseEnvContent("FOO=")).toEqual({ FOO: "" });
  });

  test("returns empty object for empty content", () => {
    expect(parseEnvContent("")).toEqual({});
  });

  test("returns empty object for only comments", () => {
    const content = `# comment 1
# comment 2`;
    expect(parseEnvContent(content)).toEqual({});
  });
});

describe("validateUnknownFlags", () => {
  const createToken = (name: string): ArgToken => ({
    kind: "option",
    name,
    rawName: `--${name}`,
    value: undefined,
    index: 0,
  });

  const baseArgs: Record<string, ArgSchema> = {
    dryRun: {
      type: "boolean",
      short: "d",
    },
    profile: {
      type: "string",
      short: "p",
    },
  };

  test("returns null for known options", () => {
    const tokens = [createToken("dry-run")];
    expect(validateUnknownFlags(tokens, baseArgs)).toBeNull();
  });

  test("returns null for known short options converted to long", () => {
    const tokens = [createToken("profile")];
    expect(validateUnknownFlags(tokens, baseArgs)).toBeNull();
  });

  test("returns null for built-in help option", () => {
    const tokens = [createToken("help")];
    expect(validateUnknownFlags(tokens, {})).toBeNull();
  });

  test("returns null for built-in version option", () => {
    const tokens = [createToken("version")];
    expect(validateUnknownFlags(tokens, {})).toBeNull();
  });

  test("returns error for unknown option", () => {
    const tokens = [createToken("unknown")];
    expect(validateUnknownFlags(tokens, baseArgs)).toBe("Unknown option: --unknown");
  });

  test("returns null for --no- prefixed negatable options", () => {
    const tokens = [createToken("no-dry-run")];
    expect(validateUnknownFlags(tokens, baseArgs)).toBeNull();
  });

  test("returns error for --no- prefixed unknown options", () => {
    const tokens = [createToken("no-unknown")];
    expect(validateUnknownFlags(tokens, baseArgs)).toBe("Unknown option: --no-unknown");
  });

  test("returns null for empty tokens", () => {
    expect(validateUnknownFlags([], baseArgs)).toBeNull();
  });

  test("ignores non-option tokens", () => {
    const tokens: ArgToken[] = [{ kind: "positional", value: "some-value", index: 0 }];
    expect(validateUnknownFlags(tokens, baseArgs)).toBeNull();
  });

  test("returns first unknown option when multiple unknown options exist", () => {
    const tokens = [createToken("unknown1"), createToken("unknown2")];
    expect(validateUnknownFlags(tokens, baseArgs)).toBe("Unknown option: --unknown1");
  });
});

describe("isTemplateMode", () => {
  test("returns false when no template flags", () => {
    expect(isTemplateMode({})).toBe(false);
  });

  test("returns true when --template", () => {
    expect(isTemplateMode({ template: true })).toBe(true);
  });

  test("returns false when --template is false", () => {
    expect(isTemplateMode({ template: false })).toBe(false);
  });

  test("returns true when --application", () => {
    expect(isTemplateMode({ application: "app" })).toBe(true);
  });

  test("returns true when --stage", () => {
    expect(isTemplateMode({ stage: "prod" })).toBe(true);
  });

  test("returns true when all flags are set", () => {
    expect(isTemplateMode({ template: true, application: "app", stage: "prod" })).toBe(true);
  });
});

describe("validateNameTemplateConflict", () => {
  test("returns null when no conflict", () => {
    expect(validateNameTemplateConflict({ name: "secret" })).toBeNull();
    expect(validateNameTemplateConflict({ template: true })).toBeNull();
  });

  test("returns null when only template mode flags", () => {
    expect(validateNameTemplateConflict({ application: "app", stage: "prod" })).toBeNull();
  });

  test("returns error when --name with --template", () => {
    const result = validateNameTemplateConflict({ name: "s", template: true });
    expect(result).toContain("--template");
    expect(result).toContain("Cannot use --name");
  });

  test("returns error when --name with --application", () => {
    const result = validateNameTemplateConflict({ name: "s", application: "a" });
    expect(result).toContain("--application");
    expect(result).toContain("Cannot use --name");
  });

  test("returns error when --name with --stage", () => {
    const result = validateNameTemplateConflict({ name: "s", stage: "p" });
    expect(result).toContain("--stage");
    expect(result).toContain("Cannot use --name");
  });

  test("returns error with all conflicting flags listed", () => {
    const result = validateNameTemplateConflict({
      name: "s",
      template: true,
      application: "a",
      stage: "p",
    });
    expect(result).toContain("--template");
    expect(result).toContain("--application");
    expect(result).toContain("--stage");
  });
});

describe("mergeWithConfig", () => {
  test("CLI values take precedence over config", () => {
    const cli = { application: "cli-app" };
    const config = { application: "config-app", stage: "prod" };
    const result = mergeWithConfig(cli, config);
    expect(result.application).toBe("cli-app");
    expect(result.stage).toBe("prod");
  });

  test("undefined CLI values do not override config", () => {
    const cli = { application: undefined };
    const config = { application: "config-app" };
    const result = mergeWithConfig(cli, config);
    expect(result.application).toBe("config-app");
  });

  test("returns config values when CLI has no values", () => {
    const cli = {};
    const config = { profile: "my-profile", region: "ap-northeast-1" };
    const result = mergeWithConfig(cli, config);
    expect(result.profile).toBe("my-profile");
    expect(result.region).toBe("ap-northeast-1");
  });

  test("returns CLI values when config is empty", () => {
    const cli = { template: true, input: ".env.local" };
    const config = {};
    const result = mergeWithConfig(cli, config);
    expect(result.template).toBe(true);
    expect(result.input).toBe(".env.local");
  });

  test("handles boolean false values from CLI", () => {
    const cli = { template: false };
    const config = { template: true };
    const result = mergeWithConfig(cli, config);
    expect(result.template).toBe(false);
  });
});

describe("exec", () => {
  test("executes command and returns stdout", async () => {
    const result = await exec("echo", ["hello"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello");
    expect(result.stderr).toBe("");
  });

  test("returns stderr on error", async () => {
    const result = await exec("ls", ["nonexistent-dir-12345"]);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("No such file");
  });
});

describe("jsonToEnv", () => {
  test("converts simple key-value pairs", () => {
    const result = jsonToEnv({ FOO: "bar", BAZ: "qux" });
    expect(result).toBe('FOO="bar"\nBAZ="qux"');
  });

  test("quotes values with spaces", () => {
    const result = jsonToEnv({ FOO: "bar baz" });
    expect(result).toBe('FOO="bar baz"');
  });

  test("quotes values with hash", () => {
    const result = jsonToEnv({ FOO: "bar#baz" });
    expect(result).toBe('FOO="bar#baz"');
  });

  test("escapes double quotes in values", () => {
    const result = jsonToEnv({ FOO: 'bar"baz' });
    expect(result).toBe('FOO="bar\\"baz"');
  });

  test("handles empty value", () => {
    const result = jsonToEnv({ FOO: "" });
    expect(result).toBe('FOO=""');
  });

  test("handles empty object", () => {
    const result = jsonToEnv({});
    expect(result).toBe("");
  });

  test("handles values with single quotes", () => {
    const result = jsonToEnv({ FOO: "bar'baz" });
    expect(result).toBe('FOO="bar\'baz"');
  });

  test("handles values with newlines", () => {
    const result = jsonToEnv({ FOO: "bar\nbaz" });
    expect(result).toBe('FOO="bar\nbaz"');
  });
});

describe("generateEnvHeader", () => {
  test("generates header with secret name", () => {
    const result = generateEnvHeader("my-secret");
    expect(result).toBe("# Generated by e2sm\n# Source: my-secret");
  });

  test("handles secret name with special characters", () => {
    const result = generateEnvHeader("prod/api/secrets");
    expect(result).toBe("# Generated by e2sm\n# Source: prod/api/secrets");
  });
});
