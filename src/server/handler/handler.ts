import type { IRequestHandler } from "@notifier/server/handler/types";
import type { ServerContext } from "@notifier/server/types";
import type { Constructor } from "@notifier/utils";
import type { HandlerResponse } from "hono/dist/types/types";
import type { ContentfulStatusCode, ContentlessStatusCode } from "hono/dist/types/utils/http-status";
import { ok } from "neverthrow";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function createHandler<T extends IRequestHandler<any, any>>(ctor: Constructor<T>): (ctx: ServerContext) => HandlerResponse<any> {
  return async (ctx: ServerContext) => {
    const instance = new ctor(ctx);
    const prepareResult = instance.prepare ? await instance.prepare(ctx) : ok({});
    if (prepareResult.isErr()) {
      if (prepareResult.error.message) {
        return ctx.json(
          {
            error: prepareResult.error.message,
          },
          prepareResult.error.status as ContentfulStatusCode,
        );
      }
      return ctx.json(prepareResult.error.status as ContentlessStatusCode);
    }

    const handlerResult = await instance.handle(ctx, prepareResult.value);
    if (handlerResult.isErr()) {
      if (handlerResult.error.message) {
        return ctx.json(
          {
            error: handlerResult.error.message,
          },
          handlerResult.error.status as ContentfulStatusCode,
        );
      }
      return ctx.json(handlerResult.error.status as ContentlessStatusCode);
    }

    const r = handlerResult.value;
    if (r) {
      return ctx.json(r, 200);
    }

    return ctx.json(204);
  };
}
