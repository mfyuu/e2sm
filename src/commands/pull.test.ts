import { describe, expect, test } from "bun:test";
import { pullCommand } from "./pull";

describe("pullCommand", () => {
  test("has correct name", () => {
    expect(pullCommand.name).toBe("pull");
  });

  test("has description", () => {
    expect(pullCommand.description).toBeDefined();
    expect(pullCommand.description).toContain("AWS Secrets Manager");
    expect(pullCommand.description).toContain(".env");
  });

  test("defines profile flag", () => {
    expect(pullCommand.args?.profile).toEqual({
      type: "string",
      short: "p",
      description: "AWS profile to use",
    });
  });

  test("defines region flag", () => {
    expect(pullCommand.args?.region).toEqual({
      type: "string",
      short: "r",
      description: "AWS region to use (e.g., ap-northeast-1)",
    });
  });

  test("defines name flag", () => {
    expect(pullCommand.args?.name).toEqual({
      type: "string",
      short: "n",
      description: "Secret name to retrieve (skip interactive selection)",
    });
  });

  test("defines output flag", () => {
    expect(pullCommand.args?.output).toEqual({
      type: "string",
      short: "o",
      description: "Output .env file path (skip interactive prompt)",
    });
  });

  test("defines force flag", () => {
    expect(pullCommand.args?.force).toEqual({
      type: "boolean",
      short: "f",
      description: "Overwrite existing file without confirmation",
    });
  });
});
