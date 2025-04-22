import type { ServerContext } from "@notifier/server/types";
import type { StatusCode } from "hono/dist/types/utils/http-status";
import type { Result } from "neverthrow";

/**
 * リクエストハンドラーのエラー型
 * ハンドラーが処理中に発生したエラー情報を表す.
 */
export type RequestHandlerError = {
  /**
   * HTTPステータスコード
   * エラー時に返すHTTPステータスコード
   */
  status: StatusCode;

  /**
   * エラーメッセージ
   * クライアントに返すオプションのエラーメッセージ
   */
  message?: string;
};

/**
 * リクエストハンドラーのインターフェース
 * HTTPリクエストを処理するハンドラーの基本機能を定義する.
 *
 * @template THandleResult - ハンドラーの処理結果の型。デフォルトは `undefined`
 */
export interface IRequestHandler<THandleResult = undefined> {
  /**
   * リクエストを処理するメソッド
   *
   * @param ctx - サーバーコンテキスト
   * @returns 処理結果または処理エラーを含むPromise
   */
  handle: (ctx: ServerContext) => Promise<Result<THandleResult, RequestHandlerError>>;
}
