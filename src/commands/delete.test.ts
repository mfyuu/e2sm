import { describe, expect, test } from "bun:test";
import { deleteCommand } from "./delete";

describe("deleteCommand", () => {
  test("has correct name", () => {
    expect(deleteCommand.name).toBe("delete");
  });

  test("has description", () => {
    expect(deleteCommand.description).toBeDefined();
  });

  test("defines profile flag", () => {
    expect(deleteCommand.args?.profile).toEqual({
      type: "string",
      short: "p",
      description: "AWS profile to use",
    });
  });

  test("defines region flag", () => {
    expect(deleteCommand.args?.region).toEqual({
      type: "string",
      short: "r",
      description: "AWS region to use (e.g., ap-northeast-1)",
    });
  });

  test("defines name flag", () => {
    expect(deleteCommand.args?.name).toEqual({
      type: "string",
      short: "n",
      description: "Secret name to delete (skip interactive selection)",
    });
  });

  test("defines recoveryDays flag", () => {
    expect(deleteCommand.args?.recoveryDays).toEqual({
      type: "string",
      short: "d",
      toKebab: true,
      description: "Recovery window in days (7-30)",
    });
  });

  test("defines force flag", () => {
    expect(deleteCommand.args?.force).toEqual({
      type: "boolean",
      short: "f",
      description: "Skip confirmation prompt",
    });
  });
});
