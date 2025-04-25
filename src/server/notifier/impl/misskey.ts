import { type INotifierConfig, NotifierBase } from "@notifier/server/notifier/base";
import type { INotifierPayload } from "@notifier/server/notifier/types";
import type { DestinationConfigItem, ServerContext } from "@notifier/server/types";

export type MisskeyNotificationServiceConfig = INotifierConfig & DestinationConfigItem<"misskey">;

export type MisskeyNotificationPayload = INotifierPayload;

export class MisskeyNotificationService extends NotifierBase<MisskeyNotificationPayload, MisskeyNotificationServiceConfig> {
  // biome-ignore lint/complexity/noUselessConstructor: <explanation>
  constructor(ctx: ServerContext, config: MisskeyNotificationServiceConfig) {
    super(ctx, config);
  }

  override async send(payload: MisskeyNotificationPayload): Promise<void> {
    const { token, defaultPostVisibility, url: _url } = this.config.config;
    const url = _url.endsWith("/") ? _url : `${_url}/`;

    if (this.config.options.debug.printPayload) {
      this.ctx.var.logger.info("payload: ", JSON.stringify(payload));
    }

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
    })
      .then((res) => {
        if (!res.ok) {
          this.ctx.var.logger.error(`${res.statusText}`, "error");
        }
      })
      .catch((error) => {
        this.ctx.var.logger.error(`Error sending notification: ${String(error)}`, "error");
      });
  }
}
