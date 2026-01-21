import type { ArgSchema, ArgToken } from "gunshi";
import { describe, expect, test } from "bun:test";
import { parseEnvContent, toKebabCase, validateUnknownFlags } from "./lib";

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
