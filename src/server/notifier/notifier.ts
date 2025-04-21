import { MisskeyNotificationService, misskeyNotifierServiceConfigLoader } from "@notifier/server/notifier/impl/misskey";
import type { INotifier, INotifierPayload } from "@notifier/server/notifier/types";
import type { ServerContext } from "@notifier/server/types";

export class Notifier implements INotifier {
  private readonly services: INotifier[] = [];

  initialize(ctx: ServerContext) {
    const config = ctx.var.config;
    if (config.notifyTo.misskey.enabled) {
      const cfg = misskeyNotifierServiceConfigLoader(ctx);
      if (cfg.isOk()) {
        this.services.push(new MisskeyNotificationService(ctx, cfg.value));
      } else {
        ctx.var.logger.warn(`Misskey notifier config error: ${cfg.error.message}`);
      }
    }
  }

  async send<T extends INotifierPayload>(payload: T): Promise<void> {
    for (const service of this.services) {
      await service.send(payload);
    }
  }
}
