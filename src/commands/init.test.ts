import { describe, expect, test } from "bun:test";
import { parse } from "jsonc-parser";
import template from "../../assets/template.jsonc" with { type: "text" };
import { initCommand } from "./init";

describe("initCommand", () => {
  test("has correct name", () => {
    expect(initCommand.name).toBe("init");
  });

  test("has description", () => {
    expect(initCommand.description).toBeDefined();
    expect(initCommand.description).toContain(".e2smrc.jsonc");
  });

  test("defines force flag", () => {
    expect(initCommand.args?.force).toEqual({
      type: "boolean",
      short: "f",
      description: "Overwrite existing configuration file",
    });
  });
});

describe("template.jsonc", () => {
  test("is valid JSONC", () => {
    expect(() => parse(template)).not.toThrow();
  });

  test("contains $schema field", () => {
    const config = parse(template);
    expect(config.$schema).toBe("https://unpkg.com/e2sm/assets/schema.json");
  });

  test("contains commented examples for all config options", () => {
    // Verify template has comments for key options
    expect(template).toContain("// Secret name");
    expect(template).toContain("// Or use template mode");
    expect(template).toContain("// AWS settings");
    expect(template).toContain("// File paths");
  });
});
