import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 3000;
const DEFAULT_REDIS_URL = "redis://127.0.0.1:6379";
const DEFAULT_COOKIE_NAME = "whocan_session";
const DEFAULT_SESSION_TTL_SECONDS = 365 * 24 * 60 * 60;

export interface AppConfig {
  readonly port: number;
  readonly redisUrl: string;
  readonly cookieName: string;
  readonly sessionTtlSeconds: number;
  readonly isProduction: boolean;
  readonly publicDir: string;
  readonly htmlDir: string;
}

function projectRoot(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, "..");
}

function readPort(value: string | undefined): number {
  if (!value) return DEFAULT_PORT;

  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  loadEnv({ quiet: true });

  const root = projectRoot();
  return {
    port: readPort(env.PORT),
    redisUrl: env.REDIS_URL || DEFAULT_REDIS_URL,
    cookieName: env.COOKIE_NAME || DEFAULT_COOKIE_NAME,
    sessionTtlSeconds: DEFAULT_SESSION_TTL_SECONDS,
    isProduction: env.NODE_ENV === "production",
    publicDir: path.join(root, "public"),
    htmlDir: path.join(root, "public", "html"),
  };
}
