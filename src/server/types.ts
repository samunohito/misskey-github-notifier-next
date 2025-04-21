import type { IContainer } from "@notifier/server/container";
import type { ILogger } from "@notifier/server/logger";
import type { Context } from "hono";

type RecursivePartial<T> = {
  [K in keyof T]?: T[K] extends object ? RecursivePartial<T[K]> : T[K];
};

export type Config = {
  sender: {
    github: {
      webhookSecret?: string;
    };
  };
  notifyTo: {
    misskey: {
      enabled?: boolean;
      url?: string;
      token?: string;
      defaultPostVisibility?: string;
    };
  };
  option: {
    github: {
      webhook: {
        printPayload?: boolean;
      };
    };
  };
};

export type Environment = {
  CONFIG?: RecursivePartial<Config>;
  ENV_SENDER_GITHUB_WEBHOOK_SECRET?: string;
  ENV_NOTIFY_TO_MISSKEY_ENABLED?: string;
  ENV_NOTIFY_TO_MISSKEY_URL?: string;
  ENV_NOTIFY_TO_MISSKEY_TOKEN?: string;
  ENV_NOTIFY_TO_MISSKEY_DEFAULT_POST_VISIBILITY?: string;
  ENV_OPTION_GITHUB_WEBHOOK_PRINT_PAYLOAD?: string;
};

export type Variables = {
  container: IContainer;
  config: Config;
  logger: ILogger;
};

export type ServerEnvironment = {
  Bindings: Environment;
  Variables: Variables;
};

export type ServerContext = Context<ServerEnvironment>;

export const misskeyPostVisibilities = ["public", "home", "followers", "specified"];
export type MisskeyPostVisibility = (typeof misskeyPostVisibilities)[number];
