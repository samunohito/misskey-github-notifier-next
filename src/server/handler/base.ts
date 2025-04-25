import type { IRequestHandler, RequestHandlerError } from "@notifier/server/handler/types";
import type { ServerContext } from "@notifier/server/types";
import { type Result, err, ok } from "neverthrow";

/**
 * リクエスト前処理で生成される型.
 * 前処理で取得・検証されて安全に使用可能になった値群を格納する.
 */
export type IPrepareContext = {};

/**
 * リクエストハンドラーの設定値型
 */
export type IRequestHandlerConfig = {};

/**
 * リクエストハンドラーの基底クラス
 * HTTPリクエスト処理の実装に必要な共通機能を提供する抽象クラス
 */
export abstract class RequestHandlerBase<
  TConfigType extends IRequestHandlerConfig = IRequestHandlerConfig,
  TPrepareContext extends IPrepareContext = IPrepareContext,
  THandleResult = undefined,
> implements IRequestHandler<THandleResult>
{
  protected readonly ctx: ServerContext;
  protected readonly config: TConfigType;

  protected constructor(ctx: ServerContext, config: TConfigType) {
    this.ctx = ctx;
    this.config = config;
  }

  /**
   * {@inheritDoc}
   */
  public async handle(ctx: ServerContext): Promise<Result<THandleResult, RequestHandlerError>> {
    const prepareResult = await this.prepare(ctx).catch((error) => err(error));
    if (prepareResult.isErr()) {
      return err(prepareResult.error);
    }

    return this.doHandle(ctx, prepareResult.value).catch((error) => err(error));
  }

  /**
   * リクエスト処理の前処理を行う.
   *
   * リクエストからのパラメータ抽出やconfigからの設定値収集など、実際のリクエスト処理を行うまでに必要な準備をする.
   * 安全に使用できるようになった値群を戻り値とすることで、{@link doHandle}のパラメータとして利用可能となる.
   *
   * また、この関数でエラーを返却した時（またはハンドルされていない例外が発生した時）は{@link doHandle}は呼び出されず、
   * {@link handle}の呼び出し元に直接エラーを返却する.
   *
   * なお、前処理が不要であれば拡張は不要である.
   *
   * @param ctx サーバーコンテキスト
   */
  protected prepare(ctx: ServerContext): Promise<Result<TPrepareContext, RequestHandlerError>> {
    return Promise.resolve(ok({} as TPrepareContext));
  }

  /**
   * 実際にリクエストのハンドリングを行う.
   *
   * {@link prepare}メソッドで前処理された安全なコンテキストを受け取り、
   * リクエストに対する本質的な処理を実行する。このメソッドは具象クラスで実装する必要がある.
   *
   * 処理が成功した場合は{@link import('neverthrow').ok}で結果を返し、エラーが発生した場合は
   * {@link import('neverthrow').err}でエラー情報を返す。未処理の例外が発生した場合は{@link handle}メソッドによって
   * キャッチされ、エラーとして処理される.
   *
   * @param ctx サーバーコンテキスト
   * @param prepare {@link prepare}で生成されたコンテキスト
   */
  protected abstract doHandle(ctx: ServerContext, prepare: TPrepareContext): Promise<Result<THandleResult, RequestHandlerError>>;
}
