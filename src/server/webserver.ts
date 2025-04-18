import { configLoader } from "@notifier/server/config";
import { Container, DI } from "@notifier/server/container";
import { GithubWebhookRequestHandler } from "@notifier/server/handler/github-webhook/request-handler";
import { createHandler } from "@notifier/server/handler/handler";
import { Notifier } from "@notifier/server/notifier/notifier";
import type { ServerEnvironment } from "@notifier/server/types";
import { Hono, type MiddlewareHandler } from "hono";
import { getRuntimeKey } from "hono/adapter";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

const configMiddleware: MiddlewareHandler<ServerEnvironment> = async (c, next) => {
  const config = configLoader(c);
  c.set("config", config);
  await next();
};

const requestIdMiddleware: MiddlewareHandler<ServerEnvironment> = async (c, next) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  c.set("requestId", requestId);
  await next();
};

const containerMiddleware: MiddlewareHandler<ServerEnvironment> = async (c, next) => {
  const container = new Container();
  c.set("container", container);

  const notifier = new Notifier();
  notifier.initialize(c);
  container.set(DI.notifier, notifier);

  await next();

  await container.dispose();
};

export function setupServer() {
  const app = new Hono<ServerEnvironment>();

  // Middleware
  app.use("*", logger());
  app.use("*", secureHeaders());
  app.use("*", configMiddleware);
  app.use("*", requestIdMiddleware);
  app.use("*", containerMiddleware);

  // Handlers
  app.post("/github/webhook", createHandler(GithubWebhookRequestHandler));

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
