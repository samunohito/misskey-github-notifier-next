import type { IRequestHandler, RequestHandlerError } from "@notifier/server/handler/types";
import type { ServerContext } from "@notifier/server/types";
import type { HandlerResponse } from "hono/dist/types/types";
import type { ContentfulStatusCode, ContentlessStatusCode } from "hono/dist/types/utils/http-status";

/**
 * リクエストハンドラーのエラーを処理する関数
 * ハンドラーから返されたエラーを適切なHTTPレスポンスに変換します
 *
 * @param ctx - サーバーコンテキスト
 * @param error - 処理されたエラー情報
 * @returns エラー情報を含むHTTPレスポンス
 */
function handleError(ctx: ServerContext, error: RequestHandlerError): HandlerResponse<unknown> {
  const { status, message } = error;
  ctx.var.logger.error(`${status} ${message ?? "Internal Server Error"}`);

  if (message) {
    return ctx.json(
      {
        error: message,
      },
      status as ContentfulStatusCode,
    );
  }

  return ctx.json(status as ContentlessStatusCode);
}

/**
 * {@link import('hono').Hono}のリクエストを{@link IRequestHandler}の実装を使用してハンドリングするアダプター関数
 *
 * このアダプターは、{@link IRequestHandler}インターフェースを実装したクラスをHonoのハンドラー関数に変換します.
 * リクエスト処理の結果に基づいて適切なHTTPレスポンスを生成し、クライアントへの返却処理も行います.
 */
export function handlerAdapter<THandleResult>(instance: IRequestHandler<THandleResult>): (ctx: ServerContext) => HandlerResponse<unknown> {
  return async (ctx: ServerContext) => {
    const handlerResult = await instance.handle(ctx);
    if (handlerResult.isErr()) {
      return handleError(ctx, handlerResult.error);
    }

    const r = handlerResult.value;
    if (r) {
      return ctx.json(r, 200);
    }

    return ctx.json(204);
  };
}
