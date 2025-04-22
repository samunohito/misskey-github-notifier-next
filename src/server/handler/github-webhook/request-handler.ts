import { type IPrepareContext, type IRequestHandlerConfig, RequestHandlerBase } from "@notifier/server/handler/base";
import { callEventHandler } from "@notifier/server/handler/github-webhook/event-handler";
import type { RequestHandlerError } from "@notifier/server/handler/types";
import type { ServerContext, SourceConfigItem } from "@notifier/server/types";
import type { EventPayloadMap } from "@octokit/webhooks/dist-types/generated/webhook-identifiers";
import type { WebhookEventName } from "@octokit/webhooks/dist-types/types";
import { type Result, err, ok } from "neverthrow";
import { verifySignature } from "./signature-verifier";

export type GithubWebhookRequestHandlerConfig = IRequestHandlerConfig & SourceConfigItem<"github-webhook">;

export type GithubWebhookPrepareContext = IPrepareContext & {
  eventName: WebhookEventName;
};

export type GithubWebhookHandleResult = {
  status: number;
  message: string;
};

export class GithubWebhookRequestHandler extends RequestHandlerBase<GithubWebhookRequestHandlerConfig, GithubWebhookPrepareContext, GithubWebhookHandleResult> {
  // biome-ignore lint/complexity/noUselessConstructor: <explanation>
  constructor(ctx: ServerContext, config: GithubWebhookRequestHandlerConfig) {
    super(ctx, config);
  }

  override async prepare(ctx: ServerContext): Promise<Result<GithubWebhookPrepareContext, RequestHandlerError>> {
    const signature = ctx.req.header("x-hub-signature-256");
    if (!signature) {
      return err({
        status: 401,
        message: "Missing signature",
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

    const webhookSecret = this.config.config.webhookSecret;
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

  override async doHandle(ctx: ServerContext, prepare: GithubWebhookPrepareContext): Promise<Result<GithubWebhookHandleResult, RequestHandlerError>> {
    const { eventName } = prepare;
    const payload = await ctx.req.json<EventPayloadMap[typeof eventName]>();

    try {
      await callEventHandler(eventName, payload, ctx, prepare, this.config);
      return ok({
        status: 200,
        message: "ok",
      });
    } catch (error) {
      return err({
        status: 500,
        message: `Error handling event ${eventName}: ${String(error)}`,
      });
    }
  }
}
