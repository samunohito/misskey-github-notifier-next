import type { Config, ServerContext } from "@notifier/server/types";
import { env, getRuntimeKey } from "hono/adapter";

export function configLoader(ctx: ServerContext): Config {
  const c = env(ctx, getRuntimeKey());

  return {
    sender: {
      github: {
        webhookSecret: c.CONFIG?.sender?.github?.webhookSecret ?? c.ENV_SENDER_GITHUB_WEBHOOK_SECRET,
      },
    },
    notifyTo: {
      misskey: {
        enabled: c.CONFIG?.notifyTo?.misskey?.enabled ?? c.ENV_NOTIFY_TO_MISSKEY_ENABLED === "true",
        url: c.CONFIG?.notifyTo?.misskey?.url ?? c.ENV_NOTIFY_TO_MISSKEY_URL,
        token: c.CONFIG?.notifyTo?.misskey?.token ?? c.ENV_NOTIFY_TO_MISSKEY_TOKEN,
        defaultPostVisibility: c.CONFIG?.notifyTo?.misskey?.defaultPostVisibility ?? c.ENV_NOTIFY_TO_MISSKEY_DEFAULT_POST_VISIBILITY,
      },
    },
  };
}
