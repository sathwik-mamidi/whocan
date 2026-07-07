import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { RedisWhocanStore } from "./store.js";

async function start(): Promise<void> {
  const config = readConfig();
  const store = RedisWhocanStore.create(config.redisUrl, config.sessionTtlSeconds);

  store.onError((error) => {
    console.error("Redis client error", error);
  });

  await store.connect();

  const app = createApp({ config, store });
  const server = app.listen(config.port, () => {
    console.log(`Whocan listening on http://localhost:${config.port}`);
  });

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    console.log(`Received ${signal}; shutting down.`);

    server.close(async (error) => {
      if (error) console.error(error);
      await store.close();
      process.exit(error ? 1 : 0);
    });
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
