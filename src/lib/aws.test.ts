import { describe, expect, test } from "bun:test";
import { exec } from "./aws";

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
