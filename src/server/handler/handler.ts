import type { IRequestHandler, RequestHandlerError } from "@notifier/server/handler/types";
import type { ServerContext } from "@notifier/server/types";
import type { Constructor } from "@notifier/utils";
import type { HandlerResponse } from "hono/dist/types/types";
import type { ContentfulStatusCode, ContentlessStatusCode } from "hono/dist/types/utils/http-status";
import { ok } from "neverthrow";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function handleError(ctx: ServerContext, error: RequestHandlerError): HandlerResponse<any> {
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

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function createHandler<T extends IRequestHandler<any, any>>(ctor: Constructor<T>): (ctx: ServerContext) => HandlerResponse<any> {
  return async (ctx: ServerContext) => {
    const instance = new ctor(ctx);
    const prepareResult = instance.prepare ? await instance.prepare(ctx) : ok({});
    if (prepareResult.isErr()) {
      return handleError(ctx, prepareResult.error);
    }

    const handlerResult = await instance.handle(ctx, prepareResult.value);
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
