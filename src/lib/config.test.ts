import { describe, expect, test } from "bun:test";
import { mergeWithConfig } from "./config";

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
