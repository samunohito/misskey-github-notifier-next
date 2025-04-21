import type { INotifier, INotifierConfig, INotifierPayload } from "@notifier/server/notifier/types";
import type { ServerContext } from "@notifier/server/types";
import type { Result } from "neverthrow";

export type ConfigLoadError = {
  message: string;
};
export type INotifierConfigLoader<TParams = unknown, TConfig extends INotifierConfig = INotifierConfig> = (params: TParams) => Result<TConfig, ConfigLoadError>;

export abstract class NotifierBase<TPayload extends INotifierPayload = INotifierPayload, TConfig extends INotifierConfig = INotifierConfig>
  implements INotifier<TPayload>
{
  protected readonly ctx: ServerContext;
  protected readonly config: TConfig;

  protected constructor(ctx: ServerContext, config: TConfig) {
    this.ctx = ctx;
    this.config = config;
  }

  abstract send(payload: TPayload): Promise<void>;
}
