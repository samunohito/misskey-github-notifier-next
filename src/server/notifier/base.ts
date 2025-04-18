import type { INotifier, INotifierConfig, INotifierPayload } from "@notifier/server/notifier/types";
import type { Result } from "neverthrow";

export type ConfigLoadError = {
  message: string;
};
export type INotifierConfigLoader<TParams = unknown, TConfig extends INotifierConfig = INotifierConfig> = (params: TParams) => Result<TConfig, ConfigLoadError>;

export abstract class NotifierBase<TPayload extends INotifierPayload = INotifierPayload, TConfig extends INotifierConfig = INotifierConfig>
  implements INotifier<TPayload>
{
  protected readonly config: TConfig;

  protected constructor(config: TConfig) {
    this.config = config;
  }

  abstract send(payload: TPayload): Promise<void>;
}
