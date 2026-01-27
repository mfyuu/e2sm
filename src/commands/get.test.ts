import { describe, expect, test } from "bun:test";
import { getCommand } from "./get";

describe("getCommand", () => {
  test("has correct name", () => {
    expect(getCommand.name).toBe("get");
  });

  test("has description", () => {
    expect(getCommand.description).toBeDefined();
  });

  test("defines profile flag", () => {
    expect(getCommand.args?.profile).toEqual({
      type: "string",
      short: "p",
      description: "AWS profile to use",
    });
  });

  test("defines region flag", () => {
    expect(getCommand.args?.region).toEqual({
      type: "string",
      short: "r",
      description: "AWS region to use (e.g., ap-northeast-1)",
    });
  });

  test("defines name flag", () => {
    expect(getCommand.args?.name).toEqual({
      type: "string",
      short: "n",
      description: "Secret name to retrieve (skip interactive selection)",
    });
  });
});
