import { beforeEach, describe, expect, it, vi } from "vitest";
import { GithubWebhookRequestHandler } from "@notifier/server/handler/github-webhook/request-handler";
import type { ServerContext } from "@notifier/server/types";
import { err, ok } from "neverthrow";

// Mock the signature verifier and event handler
vi.mock("@notifier/server/handler/github-webhook/signature-verifier", () => ({
  verifySignature: vi.fn(),
}));

vi.mock("@notifier/server/handler/github-webhook/event-handler", () => ({
  callEventHandler: vi.fn(),
}));

// Import mocked functions
import { verifySignature } from "@notifier/server/handler/github-webhook/signature-verifier";
import { callEventHandler } from "@notifier/server/handler/github-webhook/event-handler";

describe("GithubWebhookRequestHandler", () => {
  const createMockContext = (headers: Record<string, string | undefined>, body: string | null): ServerContext => {
    let bodyConsumed = false;
    return {
      req: {
        header: (name: string) => headers[name],
        text: async () => {
          if (bodyConsumed) throw new Error("Body already consumed");
          bodyConsumed = true;
          if (body === null) return "";
          return body;
        },
        json: async () => {
          return JSON.parse(body || "{}");
        },
      },
      var: {
        config: {},
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
        container: new Map(),
      },
    } as unknown as ServerContext;
  };

  const mockConfig = {
    id: "github",
    type: "github-webhook" as const,
    enabled: true,
    notifyTo: ["misskey-dest"],
    options: {
      debug: {
        printPayload: false,
      },
    },
    config: {
      webhookSecret: "test-secret",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("prepare", () => {
    it("署名ヘッダが欠落している場合、401エラーを返す", async () => {
      const ctx = createMockContext({}, '{"test":"data"}');
      const handler = new GithubWebhookRequestHandler(ctx, mockConfig);

      const result = await handler.prepare(ctx);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(401);
        expect(result.error.message).toBe("Missing signature");
      }
    });

    it("イベント名ヘッダが欠落している場合、400エラーを返す", async () => {
      const ctx = createMockContext(
        {
          "x-hub-signature-256": "sha256=test",
        },
        '{"test":"data"}',
      );
      const handler = new GithubWebhookRequestHandler(ctx, mockConfig);

      const result = await handler.prepare(ctx);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(400);
        expect(result.error.message).toBe("Missing event name");
      }
    });

    it("bodyが欠落している場合、400エラーを返す", async () => {
      const ctx = createMockContext(
        {
          "x-hub-signature-256": "sha256=test",
          "x-github-event": "push",
        },
        null,
      );
      const handler = new GithubWebhookRequestHandler(ctx, mockConfig);

      const result = await handler.prepare(ctx);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(400);
        expect(result.error.message).toBe("Missing payload");
      }
    });

    it("署名検証が失敗した場合、エラーを返す", async () => {
      const ctx = createMockContext(
        {
          "x-hub-signature-256": "sha256=invalid",
          "x-github-event": "push",
        },
        '{"test":"data"}',
      );
      const handler = new GithubWebhookRequestHandler(ctx, mockConfig);

      vi.mocked(verifySignature).mockResolvedValueOnce(
        err({
          status: 401,
          message: "Invalid signature",
        }),
      );

      const result = await handler.prepare(ctx);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(401);
        expect(result.error.message).toBe("Invalid signature");
      }
      expect(verifySignature).toHaveBeenCalledWith({
        payload: '{"test":"data"}',
        signature: "sha256=invalid",
        webhookSecret: "test-secret",
      });
    });

    it("すべての検証が成功した場合、イベント名とともにokを返す", async () => {
      const ctx = createMockContext(
        {
          "x-hub-signature-256": "sha256=valid",
          "x-github-event": "push",
        },
        '{"test":"data"}',
      );
      const handler = new GithubWebhookRequestHandler(ctx, mockConfig);

      vi.mocked(verifySignature).mockResolvedValueOnce(ok(undefined));

      const result = await handler.prepare(ctx);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.eventName).toBe("push");
      }
      expect(verifySignature).toHaveBeenCalledWith({
        payload: '{"test":"data"}',
        signature: "sha256=valid",
        webhookSecret: "test-secret",
      });
    });
  });

  describe("doHandle", () => {
    it("イベントハンドラが成功した場合、200を返す", async () => {
      const ctx = createMockContext(
        {
          "x-hub-signature-256": "sha256=valid",
          "x-github-event": "push",
        },
        '{"ref":"refs/heads/main"}',
      );
      const handler = new GithubWebhookRequestHandler(ctx, mockConfig);

      vi.mocked(callEventHandler).mockResolvedValueOnce(ok(undefined));

      const prepareContext = { eventName: "push" as const };
      const result = await handler.doHandle(ctx, prepareContext);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe(200);
        expect(result.value.message).toBe("ok");
      }
      expect(callEventHandler).toHaveBeenCalledWith("push", { ref: "refs/heads/main" }, ctx, prepareContext, mockConfig);
    });

    it("イベントハンドラが例外をスローした場合、500エラーを返す", async () => {
      const ctx = createMockContext(
        {
          "x-hub-signature-256": "sha256=valid",
          "x-github-event": "push",
        },
        '{"ref":"refs/heads/main"}',
      );
      const handler = new GithubWebhookRequestHandler(ctx, mockConfig);

      vi.mocked(callEventHandler).mockRejectedValueOnce(new Error("Handler failed"));

      const prepareContext = { eventName: "push" as const };
      const result = await handler.doHandle(ctx, prepareContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.status).toBe(500);
        expect(result.error.message).toContain("Error handling event push");
        expect(result.error.message).toContain("Handler failed");
      }
    });
  });
});
