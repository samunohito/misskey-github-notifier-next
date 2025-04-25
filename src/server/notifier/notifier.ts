import { MisskeyNotificationService } from "@notifier/server/notifier/impl/misskey";
import type { INotifier, INotifierPayload } from "@notifier/server/notifier/types";
import type { Config, DestinationConfigItem, ServerContext } from "@notifier/server/types";
import { type Result, err, ok } from "neverthrow";

export class Notifier implements INotifier {
  // Map of destination IDs to notification services
  private readonly services: Map<string, INotifier> = new Map();
  private readonly config: Config;

  constructor(ctx: ServerContext) {
    this.config = ctx.var.config;

    for (const destConfig of Object.values(this.config.destinations || {}).filter((it) => it.enabled)) {
      const service = this.createNotificationService(ctx, destConfig);
      if (service.isOk()) {
        this.services.set(destConfig.id, service.value);
      } else {
        ctx.var.logger.warn("Failed to initialize notification service", destConfig.id);
      }
    }

    ctx.var.logger.info(`Initialized ${this.services.size} notification services`);
  }

  private createNotificationService(ctx: ServerContext, config: DestinationConfigItem<unknown>): Result<INotifier, unknown> {
    switch (config.type) {
      case "misskey": {
        return ok(new MisskeyNotificationService(ctx, config));
      }
      default:
        return err();
    }
  }

  async send<T extends INotifierPayload>(payload: T): Promise<void> {
    const source = this.config.sources?.[payload.sourceId];
    if (!source) {
      return;
    }

    await Promise.all(
      (source.notifyTo ?? [])
        .map((it) => this.services.get(it))
        .filter((it): it is INotifier => it !== undefined)
        .map(async (it) => await it.send(payload)),
    );
  }
}
