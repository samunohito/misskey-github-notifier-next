import { describe, expect, it, vi } from "vitest";
import { Notifier } from "@notifier/server/notifier/notifier";
import type { ServerContext } from "@notifier/server/types";
import type { INotifier } from "@notifier/server/notifier/types";
import type { Config } from "@notifier/server/types";

describe("Notifier", () => {
  const createMockContext = (config: Config): ServerContext => {
    return {
      var: {
        config,
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
        container: new Map(),
      },
    } as unknown as ServerContext;
  };

  const createMockNotifierService = (): INotifier => {
    return {
      send: vi.fn().mockResolvedValue(undefined),
    };
  };

  it("未知のsource IDの場合、警告を出して早期リターンする", async () => {
    const config = {
      sources: {
        github: {
          id: "github",
          type: "github-webhook",
          enabled: true,
          notifyTo: ["misskey-dest"],
        },
      },
      destinations: {
        "misskey-dest": {
          id: "misskey-dest",
          type: "misskey",
          enabled: true,
          config: {
            url: "https://misskey.example.com",
            token: "test-token",
            defaultPostVisibility: "home",
          },
        },
      },
    };

    const ctx = createMockContext(config);
    const notifier = new Notifier(ctx);

    await notifier.send({
      sourceId: "unknown-source",
      content: "Test notification",
    });

    expect(ctx.var.logger.warn).toHaveBeenCalledWith("Unknown source ID: ", "unknown-source");
  });

  it("notifyToに複数のエントリがある場合、複数のdestinationに送信する", async () => {
    const mockService1 = createMockNotifierService();
    const mockService2 = createMockNotifierService();

    const config = {
      sources: {
        github: {
          id: "github",
          type: "github-webhook",
          enabled: true,
          notifyTo: ["misskey-dest-1", "misskey-dest-2"],
        },
      },
      destinations: {
        "misskey-dest-1": {
          id: "misskey-dest-1",
          type: "misskey",
          enabled: true,
          config: {
            url: "https://misskey1.example.com",
            token: "token1",
            defaultPostVisibility: "home",
          },
        },
        "misskey-dest-2": {
          id: "misskey-dest-2",
          type: "misskey",
          enabled: true,
          config: {
            url: "https://misskey2.example.com",
            token: "token2",
            defaultPostVisibility: "public",
          },
        },
      },
    };

    const ctx = createMockContext(config);
    const notifier = new Notifier(ctx);

    // Replace the services map with our mocks
    // biome-ignore lint/suspicious/noExplicitAny: testing private field
    (notifier as any).services.set("misskey-dest-1", mockService1);
    // biome-ignore lint/suspicious/noExplicitAny: testing private field
    (notifier as any).services.set("misskey-dest-2", mockService2);

    const payload = {
      sourceId: "github",
      content: "Test notification",
    };

    await notifier.send(payload);

    expect(mockService1.send).toHaveBeenCalledWith(payload);
    expect(mockService2.send).toHaveBeenCalledWith(payload);
  });

  it("servicesマップに存在しないdestinationを無視する", async () => {
    const mockService = createMockNotifierService();

    const config = {
      sources: {
        github: {
          id: "github",
          type: "github-webhook",
          enabled: true,
          notifyTo: ["misskey-dest", "non-existent-dest"],
        },
      },
      destinations: {
        "misskey-dest": {
          id: "misskey-dest",
          type: "misskey",
          enabled: true,
          config: {
            url: "https://misskey.example.com",
            token: "test-token",
            defaultPostVisibility: "home",
          },
        },
      },
    };

    const ctx = createMockContext(config);
    const notifier = new Notifier(ctx);

    // Replace the services map with our mock
    // biome-ignore lint/suspicious/noExplicitAny: testing private field
    (notifier as any).services.set("misskey-dest", mockService);

    const payload = {
      sourceId: "github",
      content: "Test notification",
    };

    await notifier.send(payload);

    // Should only call the existing service
    expect(mockService.send).toHaveBeenCalledTimes(1);
    expect(mockService.send).toHaveBeenCalledWith(payload);
  });

  it("通知を並列で送信する", async () => {
    const delays: number[] = [];
    const mockService1: INotifier = {
      send: vi.fn().mockImplementation(async () => {
        const start = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 10));
        delays.push(Date.now() - start);
      }),
    };
    const mockService2: INotifier = {
      send: vi.fn().mockImplementation(async () => {
        const start = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 10));
        delays.push(Date.now() - start);
      }),
    };

    const config = {
      sources: {
        github: {
          id: "github",
          type: "github-webhook",
          enabled: true,
          notifyTo: ["dest-1", "dest-2"],
        },
      },
      destinations: {
        "dest-1": {
          id: "dest-1",
          type: "misskey",
          enabled: true,
          config: { url: "https://m1.example.com", token: "t1", defaultPostVisibility: "home" },
        },
        "dest-2": {
          id: "dest-2",
          type: "misskey",
          enabled: true,
          config: { url: "https://m2.example.com", token: "t2", defaultPostVisibility: "home" },
        },
      },
    };

    const ctx = createMockContext(config);
    const notifier = new Notifier(ctx);

    // biome-ignore lint/suspicious/noExplicitAny: testing private field
    (notifier as any).services.set("dest-1", mockService1);
    // biome-ignore lint/suspicious/noExplicitAny: testing private field
    (notifier as any).services.set("dest-2", mockService2);

    const startTime = Date.now();
    await notifier.send({
      sourceId: "github",
      content: "Test",
    });
    const totalTime = Date.now() - startTime;

    // If parallel, total time should be close to 10ms (not 20ms)
    expect(totalTime).toBeLessThan(20);
    expect(mockService1.send).toHaveBeenCalled();
    expect(mockService2.send).toHaveBeenCalled();
  });

  it("notifyToが空配列の場合を処理する", async () => {
    const config = {
      sources: {
        github: {
          id: "github",
          type: "github-webhook",
          enabled: true,
          notifyTo: [],
        },
      },
      destinations: {},
    };

    const ctx = createMockContext(config);
    const notifier = new Notifier(ctx);

    // Should not throw
    await notifier.send({
      sourceId: "github",
      content: "Test notification",
    });

    // No errors expected
    expect(ctx.var.logger.warn).not.toHaveBeenCalled();
  });

  it("enabledなdestinationのみを初期化する", async () => {
    const config = {
      sources: {},
      destinations: {
        "enabled-dest": {
          id: "enabled-dest",
          type: "misskey",
          enabled: true,
          config: {
            url: "https://misskey.example.com",
            token: "test-token",
            defaultPostVisibility: "home",
          },
          options: {
            debug: {
              printPayload: false,
            },
          },
        },
        "disabled-dest": {
          id: "disabled-dest",
          type: "misskey",
          enabled: false,
          config: {
            url: "https://misskey2.example.com",
            token: "test-token-2",
            defaultPostVisibility: "home",
          },
          options: {
            debug: {
              printPayload: false,
            },
          },
        },
      },
    };

    const ctx = createMockContext(config);
    const notifier = new Notifier(ctx);

    // biome-ignore lint/suspicious/noExplicitAny: testing private field
    const services = (notifier as any).services as Map<string, INotifier>;
    expect(services.has("enabled-dest")).toBe(true);
    expect(services.has("disabled-dest")).toBe(false);
  });
});
