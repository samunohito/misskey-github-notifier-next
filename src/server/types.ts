import type { IContainer } from "@notifier/server/container";
import type { Context } from "hono";

export type Config = {
  sender?: {
    github?: {
      webhookSecret?: string;
    };
  };
  notifyTo?: {
    misskey?: {
      enabled?: boolean;
      url?: string;
      token?: string;
      defaultPostVisibility?: string;
    };
  };
};

export type Environment = {
  CONFIG?: Config;
  ENV_SENDER_GITHUB_WEBHOOK_SECRET?: string;
  ENV_NOTIFY_TO_MISSKEY_ENABLED?: string;
  ENV_NOTIFY_TO_MISSKEY_URL?: string;
  ENV_NOTIFY_TO_MISSKEY_TOKEN?: string;
  ENV_NOTIFY_TO_MISSKEY_DEFAULT_POST_VISIBILITY?: string;
};

export type Variables = {
  requestId: string;
  container: IContainer;
  config: Config;
};

export type ServerEnvironment = {
  Bindings: Environment;
  Variables: Variables;
};

export type ServerContext = Context<ServerEnvironment>;

export const misskeyPostVisibilities = ["public", "home", "followers", "specified"];
export type MisskeyPostVisibility = (typeof misskeyPostVisibilities)[number];
