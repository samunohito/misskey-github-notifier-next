import { type ConfigLoadError, type INotifierConfigLoader, NotifierBase } from "@notifier/server/notifier/base";
import type { INotifierConfig, INotifierPayload } from "@notifier/server/notifier/types";
import type { MisskeyPostVisibility, ServerContext } from "@notifier/server/types";
import { log } from "@notifier/utils";
import { type Result, err, ok } from "neverthrow";

export const misskeyNotifierServiceConfigLoader: INotifierConfigLoader<ServerContext, MisskeyNotificationServiceConfig> = (
  ctx: ServerContext,
): Result<MisskeyNotificationServiceConfig, ConfigLoadError> => {
  const url = ctx.var.config.notifyTo?.misskey?.url;
  const token = ctx.var.config.notifyTo?.misskey?.token;
  const defaultPostVisibility = (ctx.var.config.notifyTo?.misskey?.defaultPostVisibility ?? "home") as MisskeyPostVisibility;

  if (!url || !token) {
    return err({
      message: "Misskey URL and token are required",
    });
  }

  return ok({
    url,
    token,
    defaultPostVisibility,
  });
};

export interface MisskeyNotificationServiceConfig extends INotifierConfig {
  url: string;
  token: string;
  defaultPostVisibility: MisskeyPostVisibility;
}

export interface MisskeyNotificationPayload extends INotifierPayload {
  content: string;
}

export class MisskeyNotificationService extends NotifierBase<MisskeyNotificationPayload, MisskeyNotificationServiceConfig> {
  // biome-ignore lint/complexity/noUselessConstructor: <explanation>
  constructor(config: MisskeyNotificationServiceConfig) {
    super(config);
  }

  override async send(payload: MisskeyNotificationPayload): Promise<void> {
    const { token, defaultPostVisibility } = this.config;
    const url = this.config.url.endsWith("/") ? this.config.url : `${this.config.url}/`;

    return fetch(`${url}api/notes/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: payload.content,
        visibility: defaultPostVisibility,
      }),
    }).then((res) => {
      if (!res.ok) {
        log(`${res.statusText}`, "error");
      }
    });
  }
}
