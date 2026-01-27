import { spawn } from "node:child_process";

export function exec(
  command: string,
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

export interface SecretListEntry {
  Name: string;
  ARN: string;
}

export interface SecretListResponse {
  SecretList: SecretListEntry[];
}

/**
 * Fetches the list of secrets from AWS Secrets Manager.
 */
export async function fetchSecretList(options: {
  profile?: string;
  region?: string;
}): Promise<{ secrets: SecretListEntry[] } | { error: string }> {
  const profileArgs = options.profile ? ["--profile", options.profile] : [];
  const regionArgs = options.region ? ["--region", options.region] : [];

  const result = await exec("aws", [
    "secretsmanager",
    "list-secrets",
    ...profileArgs,
    ...regionArgs,
  ]);

  if (result.exitCode !== 0) {
    return { error: result.stderr };
  }

  const response: SecretListResponse = JSON.parse(result.stdout);
  return { secrets: response.SecretList };
}
