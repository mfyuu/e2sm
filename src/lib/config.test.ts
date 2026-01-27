import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import { unlink } from "node:fs/promises";
import { loadConfig, mergeWithConfig } from "./config";

describe("loadConfig", () => {
  const jsoncPath = ".e2smrc.jsonc";
  const jsonPath = ".e2smrc.json";

  afterEach(async () => {
    await unlink(jsoncPath).catch(() => {});
    await unlink(jsonPath).catch(() => {});
  });

  afterAll(async () => {
    await unlink(jsoncPath).catch(() => {});
    await unlink(jsonPath).catch(() => {});
  });

  test("parses standard JSON", async () => {
    await Bun.write(jsoncPath, JSON.stringify({ input: ".env.local" }));
    const config = await loadConfig();
    expect(config.input).toBe(".env.local");
  });

  test("parses JSONC with line comments", async () => {
    await Bun.write(
      jsoncPath,
      `{
  // This is a comment
  "input": ".env.local"
}`,
    );
    const config = await loadConfig();
    expect(config.input).toBe(".env.local");
  });

  test("parses JSONC with block comments", async () => {
    await Bun.write(
      jsoncPath,
      `{
  /* Block comment */
  "input": ".env.local"
}`,
    );
    const config = await loadConfig();
    expect(config.input).toBe(".env.local");
  });

  test("parses JSONC with trailing commas", async () => {
    await Bun.write(
      jsoncPath,
      `{
  "input": ".env.local",
}`,
    );
    const config = await loadConfig();
    expect(config.input).toBe(".env.local");
  });

  test("prefers .jsonc over .json when both exist", async () => {
    await Bun.write(jsoncPath, JSON.stringify({ input: "from-jsonc" }));
    await Bun.write(jsonPath, JSON.stringify({ input: "from-json" }));
    const config = await loadConfig();
    expect(config.input).toBe("from-jsonc");
  });

  test("falls back to .json when .jsonc does not exist (backward compatibility)", async () => {
    await Bun.write(jsonPath, JSON.stringify({ input: "from-json" }));
    const config = await loadConfig();
    expect(config.input).toBe("from-json");
  });

  test("warns and skips file with parse errors, falls back to next candidate", async () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    // Create invalid JSONC in .e2smrc.jsonc
    await Bun.write(jsoncPath, "{ invalid json }");
    // Create valid JSON in .e2smrc.json as fallback
    await Bun.write(jsonPath, JSON.stringify({ input: "from-json-fallback" }));

    const config = await loadConfig();

    expect(warnSpy).toHaveBeenCalled();
    const firstWarnMessage = warnSpy.mock.calls[0]?.[0] ?? "";
    expect(firstWarnMessage).toContain("Warning: Parse error");
    expect(firstWarnMessage).toContain(jsoncPath);
    expect(config.input).toBe("from-json-fallback");

    warnSpy.mockRestore();
  });

  test("warns for each file with parse errors", async () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    await Bun.write(jsoncPath, "{ invalid }");
    await Bun.write(jsonPath, "{ also invalid }");

    await loadConfig();

    // Should warn for both invalid files
    expect(warnSpy).toHaveBeenCalled();
    const warnCalls = warnSpy.mock.calls.map((call) => call[0]);
    expect(warnCalls.some((msg) => msg.includes(jsoncPath))).toBe(true);
    expect(warnCalls.some((msg) => msg.includes(jsonPath))).toBe(true);

    warnSpy.mockRestore();
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
