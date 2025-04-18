import { callEventHandler } from "@notifier/server/handler/github-webhook/event-handler";
import type { IPrepareContext, IRequestHandler, RequestHandlerError } from "@notifier/server/handler/types";
import type { ServerContext } from "@notifier/server/types";
import type { EventPayloadMap } from "@octokit/webhooks/dist-types/generated/webhook-identifiers";
import type { WebhookEventName } from "@octokit/webhooks/dist-types/types";
import { type Result, err, ok } from "neverthrow";
import { log } from "../../../utils";
import { verifySignature } from "./signature-verifier";

export interface IGithubWebhookPrepareContext extends IPrepareContext {
  eventName: WebhookEventName;
}

export interface IGithubWebhookHandleResult {
  status: number;
  message: string;
}

export class GithubWebhookRequestHandler implements IRequestHandler<IGithubWebhookPrepareContext, IGithubWebhookHandleResult> {
  async prepare(ctx: ServerContext): Promise<Result<IGithubWebhookPrepareContext, RequestHandlerError>> {
    const signature = ctx.req.header("x-hub-signature-256");
    if (!signature) {
      return err({
        status: 401,
        message: "Missing signature",
      });
    }

    const webhookSecret = ctx.var.config.sender?.github?.webhookSecret;
    if (!webhookSecret) {
      return err({
        status: 500,
        message: "Missing webhook secret",
      });
    }

    const eventName = ctx.req.header("x-github-event");
    if (!eventName) {
      return err({
        status: 400,
        message: "Missing event name",
      });
    }

    const payload = await ctx.req.text();
    if (!payload) {
      return err({
        status: 400,
        message: "Missing payload",
      });
    }

    const verifyResult = await verifySignature({
      payload,
      signature,
      webhookSecret,
    });
    if (verifyResult.isErr()) {
      return err(verifyResult.error);
    }

    return ok({
      eventName: eventName as WebhookEventName,
    });
  }

  async handle(ctx: ServerContext, prepare: IGithubWebhookPrepareContext): Promise<Result<IGithubWebhookHandleResult, RequestHandlerError>> {
    const requestId = ctx.var.requestId;
    const { eventName } = prepare;
    const payload = await ctx.req.json<EventPayloadMap[typeof eventName]>();

    try {
      await callEventHandler(eventName, payload, ctx, prepare);
      return ok({
        status: 200,
        message: "ok",
      });
    } catch (error) {
      log(`[${requestId}] Error handling event ${eventName}: ${error}`, "error");
      return err({
        status: 500,
        message: `Error handling event ${eventName}: ${err}`,
      });
    }
  }
}
