import { configLoader } from "@notifier/server/config";
import { Container, DI } from "@notifier/server/container";
import { entrypoint } from "@notifier/server/handler/entrypoint";
import { ConsoleLogger } from "@notifier/server/logger";
import { Notifier } from "@notifier/server/notifier/notifier";
import type { ServerEnvironment } from "@notifier/server/types";
import { Hono, type MiddlewareHandler } from "hono";
import { env, getRuntimeKey } from "hono/adapter";
import { LinearRouter } from "hono/router/linear-router";
import { secureHeaders } from "hono/secure-headers";

// 通知元・通知先の設定問わず必ず読み込まれるものの定義
const notifierContextMiddleware: MiddlewareHandler<ServerEnvironment> = async (c, next) => {
  const config = configLoader(env(c, getRuntimeKey()));
  c.set("config", config);

  const requestId = crypto.randomUUID().substring(0, 8);
  const logger = new ConsoleLogger(c, requestId);
  c.set("logger", logger);

  await next();
};

const loggerMiddleware: MiddlewareHandler<ServerEnvironment> = async (c, next) => {
  const logger = c.get("logger");

  const { method, path } = c.req;
  logger.info("<--", method, path);

  const start = Date.now();
  await next();

  logger.info("-->", method, path, c.res.status.toString(), `${Date.now() - start}ms`);
};

const containerMiddleware: MiddlewareHandler<ServerEnvironment> = async (c, next) => {
  const container = new Container();
  c.set("container", container);

  const notifier = new Notifier(c);
  container.set(DI.notifier, notifier);

  await next();

  await container.dispose();
};

export function setupServer() {
  const app = new Hono<ServerEnvironment>({
    router: new LinearRouter(),
  });

  // Middleware
  app.use("*", secureHeaders());
  app.use("*", notifierContextMiddleware);
  app.use("*", loggerMiddleware);
  app.use("*", containerMiddleware);

  app.post("/endpoint/:sourceId", (c) => {
    const sourceId = c.req.param("sourceId");
    const config = c.get("config");
    const logger = c.get("logger");

    const sourceConfig = config.sources?.[sourceId];
    if (!sourceConfig) {
      logger.warn(`Source ${sourceId} not found`);
      return c.text("Not Found", 404);
    }

    return entrypoint(c, sourceConfig);
  });

  switch (getRuntimeKey()) {
    case "bun": {
      return {
        port: process.env.SERVER_PORT ?? 8080,
        fetch: app.fetch,
      };
    }
    default: {
      return app;
    }
  }
}
