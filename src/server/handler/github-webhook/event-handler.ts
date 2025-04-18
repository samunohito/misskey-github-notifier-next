import { DI } from "@notifier/server/container";
import type { IGithubWebhookPrepareContext } from "@notifier/server/handler/github-webhook/request-handler";
import type { RequestHandlerError } from "@notifier/server/handler/types";
import { Notifier } from "@notifier/server/notifier/notifier";
import type { ServerContext } from "@notifier/server/types";
import type { EventPayloadMap } from "@octokit/webhooks/dist-types/generated/webhook-identifiers";
import type { WebhookEventName } from "@octokit/webhooks/dist-types/types";
import { type Result, err, ok } from "neverthrow";

type WebhookEventHandler<T extends WebhookEventName> = (props: {
  event: EventPayloadMap[T];
  ctx: ServerContext;
  prepare: IGithubWebhookPrepareContext;
}) => Promise<void>;

async function post(props: {
  payload: string;
  ctx: ServerContext;
}) {
  const notifier = props.ctx.var.container.get(DI.notifier);
  if (notifier instanceof Notifier) {
    await notifier.send({ content: props.payload });
  } else {
    console.warn("Notifier is not initialized");
  }
}

const eventHandlers: Partial<{
  [K in WebhookEventName]: WebhookEventHandler<K>;
}> = {
  async status({ event, ctx, prepare }) {
    if (!event.branches.map((it) => it.name).includes("develop")) return;
    if (event.state !== "error" && event.state !== "failure") return;

    const commit = event.commit;
    const parent = commit.parents[0];
    return fetch(`${parent.url}/statuses`, {
      method: "GET",
      headers: {
        "User-Agent": "misskey",
      },
    }).then(async (res) => {
      const parentStatuses = await res.json();
      const parentState = parentStatuses[0]?.state;
      const stillFailed = parentState === "failure" || parentState === "error";
      if (stillFailed) {
        return post({
          payload: `⚠️ **BUILD STILL FAILED** ⚠️: ?[<plain>${commit.commit.message}</plain>](${commit.html_url})`,
          ctx,
        });
      }

      return post({
        payload: `🚨 **BUILD FAILED** 🚨: → ?[<plain>${commit.commit.message}</plain>](${commit.html_url}) ←`,
        ctx,
      });
    });
  },
  async push({ event, ctx, prepare }) {
    if (event.ref !== "refs/heads/develop") return;

    const pusher = event.pusher;
    const compare = event.compare;
    const commits = event.commits;
    const commitHashes = commits
      .reverse()
      .map((it) => {
        return `・[?[${it.id.substring(0, 7)}](${it.url})] ${it.message.split("\n")[0]}`;
      })
      .join("\n");

    return post({
      payload: `🆕 Pushed by **${pusher.name}** with ?[${commits.length} commit${commits.length > 1 ? "s" : ""}](${compare}):\n${commitHashes}`,
      ctx,
    });
  },
  async watch({ event, ctx, prepare }) {
    const sender = event.sender;
    return post({
      payload: `$[spin ⭐️] Starred by ?[**${sender.login}**](${sender.html_url})`,
      ctx,
    });
  },
  async fork({ event, ctx, prepare }) {
    const sender = event.sender;
    const repo = event.forkee;
    return post({
      payload: `$[spin.y 🍴] ?[Forked](${repo.html_url}) by ?[**${sender.login}**](${sender.html_url})`,
      ctx,
    });
  },
  async issues({ event, ctx, prepare }) {
    const issue = event.issue;
    let title: string;
    switch (event.action) {
      case "opened":
        title = "💥 Issue opened";
        break;
      case "closed":
        switch (issue.state_reason) {
          case "completed":
            title = "💮 Issue closed";
            break;
          case "not_planned":
            title = "🚫 Issue closed";
            break;
          case "duplicate":
            title = "🚫 Issue closed as duplicate";
            break;
          default: {
            title = "💮 Issue closed";
            break;
          }
        }
        break;
      case "reopened":
        title = "🔥 Issue reopened";
        break;
      default:
        return;
    }

    return post({
      payload: `${title}: #${issue.number} "${plainTitle(issue)}"\n${issue.html_url}`,
      ctx,
    });
  },
  async issue_comment({ event, ctx, prepare }) {
    if (event.action !== "created") return;

    const issue = event.issue;
    const comment = event.comment;
    return post({
      payload: `💬 Commented on "${plainTitle(issue)}": ${event.sender.login} "${plainBody(comment)}"\n${comment.html_url}`,
      ctx,
    });
  },
  async pull_request({ event, ctx, prepare }) {
    const pr = event.pull_request;
    let title: string;
    switch (event.action) {
      case "opened":
        title = "📦 New Pull Request";
        break;
      case "reopened":
        title = "🗿 Pull Request Reopened";
        break;
      case "closed":
        title = pr.merged ? "💯 Pull Request Merged!" : "🚫 Pull Request Closed";
        break;
      case "ready_for_review":
        title = "👀 Pull Request marked as ready";
        break;
      default:
        return;
    }

    return post({
      payload: `${title}: "${plainTitle(pr)}"\n${pr.html_url}`,
      ctx,
    });
  },
  async pull_request_review({ event, ctx, prepare }) {
    if (event.action !== "submitted") return;

    const review = event.review;
    if (review.body === undefined || review.body === null || review.body.length <= 0) {
      return;
    }

    const pr = event.pull_request;
    return post({
      payload: `👀 Review submitted: "${plainTitle(pr)}": ${event.sender.login} "${plainBody(review)}"\n${review.html_url}`,
      ctx,
    });
  },
  async pull_request_review_comment({ event, ctx, prepare }) {
    if (event.action !== "created") return;

    const pr = event.pull_request;
    const comment = event.comment;
    return post({
      payload: `💬 Review commented on "${plainTitle(pr)}": ${event.sender.login} "${plainBody(comment)}"\n${comment.html_url}`,
      ctx,
    });
  },
  async release({ event, ctx, prepare }) {
    if (event.action !== "published") return;

    const release = event.release;
    return post({
      payload: `🎁 **NEW RELEASE**: [${release.tag_name}](${release.html_url}) is out. Enjoy!`,
      ctx,
    });
  },
  async discussion({ event, ctx, prepare }) {
    const discussion = event.discussion;
    let title: string;
    let url: string;
    switch (event.action) {
      case "created":
        title = "💭 Discussion opened";
        url = discussion.html_url;
        break;
      case "closed":
        title = "💮 Discussion closed";
        url = discussion.html_url;
        break;
      case "reopened":
        title = "🔥 Discussion reopened";
        url = discussion.html_url;
        break;
      case "answered":
        title = "✅ Discussion marked answer";
        url = event.answer.html_url;
        break;
      case "unanswered":
        title = "🔥 Discussion unmarked answer";
        url = discussion.html_url;
        break;
      default:
        return;
    }

    return post({
      payload: `${title}: #${discussion.number} "${plainTitle(discussion)}"\n${url}`,
      ctx,
    });
  },
  async discussion_comment({ event, ctx, prepare }) {
    if (event.action !== "created") return;

    const discussion = event.discussion;
    const comment = event.comment;

    return post({
      payload: `💬 Commented on #${discussion.number} "${plainTitle(discussion)}": ${event.sender.login} "${plainBody(comment)}"\n${comment.html_url}`,
      ctx,
    });
  },
};

function plainTitle(issue: { title: string }) {
  return `<plain>${issue.title}</plain>`;
}

function plainBody(comment: { body: string | null }) {
  return comment.body ? `<plain>${comment.body}</plain>` : "";
}

export async function callEventHandler<T extends WebhookEventName>(
  eventName: T,
  payload: EventPayloadMap[T],
  ctx: ServerContext,
  prepare: IGithubWebhookPrepareContext,
): Promise<Result<unknown, RequestHandlerError>> {
  const handler = eventHandlers[eventName];
  if (!handler) {
    return err({
      status: 400,
      message: `No handler for event ${eventName}`,
    });
  }

  try {
    await handler({
      event: payload,
      ctx,
      prepare,
    });
    return ok();
  } catch (error) {
    return err({
      status: 500,
      message: `Error handling event ${eventName}: ${error}`,
    });
  }
}
