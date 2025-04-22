import type { INotifier, INotifierPayload } from "@notifier/server/notifier/types";
import type { ServerContext } from "@notifier/server/types";

/**
 * 通知機能の設定値型
 */
export type INotifierConfig = {};

/**
 * 通知機能の基底クラス
 * 通知機能の実装に必要な共通機能を提供する抽象クラス
 */
export abstract class NotifierBase<TPayload extends INotifierPayload = INotifierPayload, TConfig extends INotifierConfig = INotifierConfig>
  implements INotifier<TPayload>
{
  protected readonly ctx: ServerContext;
  protected readonly config: TConfig;

  protected constructor(ctx: ServerContext, config: TConfig) {
    this.ctx = ctx;
    this.config = config;
  }

  /**
   * {@inheritDoc}
   */
  abstract send(payload: TPayload): Promise<void>;
}
