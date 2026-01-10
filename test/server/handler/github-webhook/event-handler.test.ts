import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callEventHandler } from "@notifier/server/handler/github-webhook/event-handler";
import { DI } from "@notifier/server/container";
import type { ServerContext } from "@notifier/server/types";
import { Notifier } from "@notifier/server/notifier/notifier";

describe("callEventHandler", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let mockNotifier: Notifier;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // Create a real Notifier instance with a mock context
    const mockNotifierContext = {
      var: {
        config: {
          sources: {},
          destinations: {},
        },
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
        container: new Map(),
      },
    } as unknown as ServerContext;
    
    mockNotifier = new Notifier(mockNotifierContext);
    // Spy on the send method
    vi.spyOn(mockNotifier, "send");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createMockContext = (): ServerContext => {
    const container = new Map();
    container.set(DI.notifier, mockNotifier);

    return {
      var: {
        config: {},
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
        container,
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

  const mockPrepareContext = {
    eventName: "push" as const,
  };

  it("サポートされていないイベントの場合、エラーを返す", async () => {
    const ctx = createMockContext();
    // biome-ignore lint/suspicious/noExplicitAny: testing unsupported event
    const result = await callEventHandler("project" as any, {} as any, ctx, mockPrepareContext, mockConfig);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.status).toBe(400);
      expect(result.error.message).toContain("No handler for event");
    }
  });

  it("debug.printPayloadがtrueの場合、payloadをログ出力する", async () => {
    const ctx = createMockContext();
    const configWithDebug = {
      ...mockConfig,
      options: {
        debug: {
          printPayload: true,
        },
      },
    };

    const payload = {
      ref: "refs/heads/develop",
      pusher: { name: "test-user" },
      compare: "https://github.com/test/compare",
      commits: [],
    };

    await callEventHandler("push", payload, ctx, mockPrepareContext, configWithDebug);

    expect(ctx.var.logger.info).toHaveBeenCalledWith(`Received event push from source ${mockConfig.id}:`, JSON.stringify(payload, null, 2));
  });

  describe("pull_request event", () => {
    it("openedアクションを処理する", async () => {
      const ctx = createMockContext();
      const payload = {
        action: "opened" as const,
        pull_request: {
          title: "Add new feature",
          html_url: "https://github.com/test/repo/pull/1",
          merged: false,
        },
      };

      await callEventHandler("pull_request", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",
        content: '📦 New Pull Request: "<plain>Add new feature</plain>"\nhttps://github.com/test/repo/pull/1',
      });
    });

    it("reopenedアクションを処理する", async () => {
      const ctx = createMockContext();
      const payload = {
        action: "reopened" as const,
        pull_request: {
          title: "Fix bug",
          html_url: "https://github.com/test/repo/pull/2",
          merged: false,
        },
      };

      await callEventHandler("pull_request", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",
        content: '🗿 Pull Request Reopened: "<plain>Fix bug</plain>"\nhttps://github.com/test/repo/pull/2',
      });
    });

    it("マージされたclosedアクションを処理する", async () => {
      const ctx = createMockContext();
      const payload = {
        action: "closed" as const,
        pull_request: {
          title: "Feature complete",
          html_url: "https://github.com/test/repo/pull/3",
          merged: true,
        },
      };

      await callEventHandler("pull_request", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",
        content: '💯 Pull Request Merged!: "<plain>Feature complete</plain>"\nhttps://github.com/test/repo/pull/3',
      });
    });

    it("マージされていないclosedアクションを処理する", async () => {
      const ctx = createMockContext();
      const payload = {
        action: "closed" as const,
        pull_request: {
          title: "Rejected PR",
          html_url: "https://github.com/test/repo/pull/4",
          merged: false,
        },
      };

      await callEventHandler("pull_request", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",
        content: '🚫 Pull Request Closed: "<plain>Rejected PR</plain>"\nhttps://github.com/test/repo/pull/4',
      });
    });

    it("ready_for_reviewアクションを処理する", async () => {
      const ctx = createMockContext();
      const payload = {
        action: "ready_for_review" as const,
        pull_request: {
          title: "Ready to review",
          html_url: "https://github.com/test/repo/pull/5",
          merged: false,
        },
      };

      await callEventHandler("pull_request", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",
        content: '👀 Pull Request marked as ready: "<plain>Ready to review</plain>"\nhttps://github.com/test/repo/pull/5',
      });
    });

    it("サポートされていないアクションを無視する", async () => {
      const ctx = createMockContext();
      const payload = {
        // biome-ignore lint/suspicious/noExplicitAny: testing unsupported action
        action: "edited" as any,
        pull_request: {
          title: "Some PR",
          html_url: "https://github.com/test/repo/pull/6",
          merged: false,
        },
      };

      await callEventHandler("pull_request", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).not.toHaveBeenCalled();
    });
  });

  describe("issues event", () => {
    it("openedアクションを処理する", async () => {
      const ctx = createMockContext();
      const payload = {
        action: "opened" as const,
        issue: {
          number: 42,
          title: "Bug report",
          html_url: "https://github.com/test/repo/issues/42",
          state_reason: null,
        },
      };

      await callEventHandler("issues", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",
        content: '💥 Issue opened: #42 "<plain>Bug report</plain>"\nhttps://github.com/test/repo/issues/42',
      });
    });

    it("completed状態でclosedアクションを処理する", async () => {
      const ctx = createMockContext();
      const payload = {
        action: "closed" as const,
        issue: {
          number: 43,
          title: "Fixed issue",
          html_url: "https://github.com/test/repo/issues/43",
          state_reason: "completed" as const,
        },
      };

      await callEventHandler("issues", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",

        content: '💮 Issue closed: #43 "<plain>Fixed issue</plain>"\nhttps://github.com/test/repo/issues/43',
      });
    });

    it("not_planned状態でclosedアクションを処理する", async () => {
      const ctx = createMockContext();
      const payload = {
        action: "closed" as const,
        issue: {
          number: 44,
          title: "Won't fix",
          html_url: "https://github.com/test/repo/issues/44",
          state_reason: "not_planned" as const,
        },
      };

      await callEventHandler("issues", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",
        content: '🚫 Issue closed: #44 "<plain>Won\'t fix</plain>"\nhttps://github.com/test/repo/issues/44',
      });
    });

    it("reopenedアクションを処理する", async () => {
      const ctx = createMockContext();
      const payload = {
        action: "reopened" as const,
        issue: {
          number: 45,
          title: "Reopened issue",
          html_url: "https://github.com/test/repo/issues/45",
          state_reason: null,
        },
      };

      await callEventHandler("issues", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",
        content: '🔥 Issue reopened: #45 "<plain>Reopened issue</plain>"\nhttps://github.com/test/repo/issues/45',
      });
    });
  });

  describe("status event (check_run equivalent)", () => {
    it("親ステータスが失敗していない場合、BUILD FAILEDを投稿する（初回失敗）", async () => {
      const ctx = createMockContext();
      const payload = {
        state: "failure" as const,
        branches: [{ name: "develop" }],
        commit: {
          commit: {
            message: "Fix typo",
          },
          html_url: "https://github.com/test/repo/commit/abc123",
          parents: [
            {
              url: "https://github.com/api/commits/parent123",
            },
          ],
        },
      };

      fetchMock.mockResolvedValueOnce({
        json: async () => [{ state: "success" }],
      });

      await callEventHandler("status", payload, ctx, mockPrepareContext, mockConfig);

      expect(fetchMock).toHaveBeenCalledWith("https://github.com/api/commits/parent123/statuses", {
        method: "GET",
        headers: {
          "User-Agent": "misskey",
        },
      });

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",
        content: "🚨 **BUILD FAILED** 🚨: → ?[<plain>Fix typo</plain>](https://github.com/test/repo/commit/abc123) ←",
      });
    });

    it("親ステータスも失敗している場合、BUILD STILL FAILEDを投稿する", async () => {
      const ctx = createMockContext();
      const payload = {
        state: "error" as const,
        branches: [{ name: "develop" }],
        commit: {
          commit: {
            message: "Another attempt",
          },
          html_url: "https://github.com/test/repo/commit/def456",
          parents: [
            {
              url: "https://github.com/api/commits/parent456",
            },
          ],
        },
      };

      fetchMock.mockResolvedValueOnce({
        json: async () => [{ state: "failure" }],
      });

      await callEventHandler("status", payload, ctx, mockPrepareContext, mockConfig);

      expect(mockNotifier.send).toHaveBeenCalledWith({
        sourceId: "github",
        content: "⚠️ **BUILD STILL FAILED** ⚠️: ?[<plain>Another attempt</plain>](https://github.com/test/repo/commit/def456)",
      });
    });

    it("developブランチ以外のstatusイベントを無視する", async () => {
      const ctx = createMockContext();
      const payload = {
        state: "failure" as const,
        branches: [{ name: "main" }],
        commit: {
          commit: {
            message: "Fix typo",
          },
          html_url: "https://github.com/test/repo/commit/abc123",
          parents: [
            {
              url: "https://github.com/api/commits/parent123",
            },
          ],
        },
      };

      await callEventHandler("status", payload, ctx, mockPrepareContext, mockConfig);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockNotifier.send).not.toHaveBeenCalled();
    });

    it("ステータスがsuccessの場合、statusイベントを無視する", async () => {
      const ctx = createMockContext();
      const payload = {
        state: "success" as const,
        branches: [{ name: "develop" }],
        commit: {
          commit: {
            message: "Fix typo",
          },
          html_url: "https://github.com/test/repo/commit/abc123",
          parents: [
            {
              url: "https://github.com/api/commits/parent123",
            },
          ],
        },
      };

      await callEventHandler("status", payload, ctx, mockPrepareContext, mockConfig);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockNotifier.send).not.toHaveBeenCalled();
    });
  });
});
