import { configLoader } from "@notifier/server/config";
import { Container, DI } from "@notifier/server/container";
import { GithubWebhookRequestHandler } from "@notifier/server/handler/github-webhook/request-handler";
import { handlerAdapter } from "@notifier/server/handler/handler-adapter";
import { ConsoleLogger } from "@notifier/server/logger";
import { Notifier } from "@notifier/server/notifier/notifier";
import type { ServerEnvironment } from "@notifier/server/types";
import { Hono, type MiddlewareHandler } from "hono";
import { getRuntimeKey } from "hono/adapter";
import { env } from "hono/dist/types/helper/adapter";
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

const dynamicRouteMiddleware = (parent: Hono<ServerEnvironment>): MiddlewareHandler<ServerEnvironment> => {
  let initialized = false;

  return async (c, next) => {
    if (!initialized) {
      const config = c.get("config");
      const logger = c.get("logger");
      const router = new Hono<ServerEnvironment>();

      for (const [sourceId, sourceConfig] of Object.entries(config.sources || {})) {
        if (sourceConfig.type === "github-webhook" && sourceConfig.enabled) {
          const path = `/${sourceId}`;
          router.post(path, handlerAdapter(new GithubWebhookRequestHandler(c, sourceConfig)));
          logger.info(`Registering dynamic webhook handler for source ${sourceId} at ${path}`);
        }
      }

      parent.route("/endpoint", router);
      initialized = true;
    }

    await next();
  };
};

export function setupServer() {
  const app = new Hono<ServerEnvironment>();

  // Middleware
  app.use("*", secureHeaders());
  app.use("*", notifierContextMiddleware);
  app.use("*", loggerMiddleware);
  app.use("*", containerMiddleware);
  app.use("*", dynamicRouteMiddleware(app));

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
