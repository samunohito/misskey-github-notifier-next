import { GithubWebhookRequestHandler } from "@notifier/server/handler/github-webhook/request-handler";
import type { IRequestHandler, RequestHandlerError } from "@notifier/server/handler/types";
import type { ServerContext, SourceConfigItem } from "@notifier/server/types";
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

export function resolveRequestHandler(ctx: ServerContext, sourceConfig: SourceConfigItem<unknown>): IRequestHandler<unknown> {
  switch (sourceConfig.type) {
    case "github-webhook": {
      return new GithubWebhookRequestHandler(ctx, sourceConfig);
    }
    default: {
      throw new Error(`Unsupported source type: ${sourceConfig.type}`);
    }
  }
}

export async function entrypoint(c: ServerContext, sourceConfig: SourceConfigItem<unknown>) {
  const instance = resolveRequestHandler(c, sourceConfig);
  const handlerResult = await instance.handle(c);
  if (handlerResult.isErr()) {
    return handleError(c, handlerResult.error);
  }

  const r = handlerResult.value;
  if (r) {
    return c.json(r, 200);
  }

  return c.json(204);
}
