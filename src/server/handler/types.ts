import type { ServerContext } from "@notifier/server/types";
import type { StatusCode } from "hono/dist/types/utils/http-status";
import type { Result } from "neverthrow";

export type RequestHandlerError = {
  status: StatusCode;
  message?: string;
};

export type IPrepareContext = {};

export interface IRequestHandler<TPrepareContext extends IPrepareContext = IPrepareContext, THandleResult = undefined> {
  prepare?: (ctx: ServerContext) => Promise<Result<TPrepareContext, RequestHandlerError>>;
  handle: (ctx: ServerContext, prepare: TPrepareContext) => Promise<Result<THandleResult, RequestHandlerError>>;
}
