import { describe, expect, test } from "bun:test";
import { setCommand } from "./set";

describe("setCommand", () => {
  test("has correct name", () => {
    expect(setCommand.name).toBe("set");
  });

  test("has description", () => {
    expect(setCommand.description).toBeDefined();
    expect(setCommand.description).toContain("AWS Secrets Manager");
  });

  test("defines dryRun flag", () => {
    expect(setCommand.args?.dryRun).toEqual({
      type: "boolean",
      short: "d",
      toKebab: true,
      description: "Preview JSON output without uploading",
    });
  });

  test("defines profile flag", () => {
    expect(setCommand.args?.profile).toEqual({
      type: "string",
      short: "p",
      description: "AWS profile to use",
    });
  });

  test("defines input flag", () => {
    expect(setCommand.args?.input).toEqual({
      type: "string",
      short: "i",
      description: "Path to the .env file (skip interactive prompt)",
    });
  });

  test("defines name flag", () => {
    expect(setCommand.args?.name).toEqual({
      type: "string",
      short: "n",
      description: "Secret name for AWS Secrets Manager (skip interactive prompt)",
    });
  });

  test("defines region flag", () => {
    expect(setCommand.args?.region).toEqual({
      type: "string",
      short: "r",
      description: "AWS region to use (e.g., ap-northeast-1)",
    });
  });

  test("defines template flag", () => {
    expect(setCommand.args?.template).toEqual({
      type: "boolean",
      short: "t",
      description: "Use template mode: generate secret name as $application/$stage",
    });
  });

  test("defines application flag", () => {
    expect(setCommand.args?.application).toEqual({
      type: "string",
      short: "a",
      description: "Application name for template mode (implies --template)",
    });
  });

  test("defines stage flag", () => {
    expect(setCommand.args?.stage).toEqual({
      type: "string",
      short: "s",
      description: "Stage name for template mode (implies --template)",
    });
  });
});
