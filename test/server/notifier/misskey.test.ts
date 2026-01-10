import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MisskeyNotificationService } from "@notifier/server/notifier/impl/misskey";
import type { ServerContext } from "@notifier/server/types";

describe("MisskeyNotificationService", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createMockContext = (): ServerContext => {
    return {
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
    id: "misskey-dest",
    type: "misskey" as const,
    enabled: true,
    options: {
      debug: {
        printPayload: false,
      },
    },
    config: {
      url: "https://misskey.example.com",
      token: "test-token",
      defaultPostVisibility: "home" as const,
    },
  };

  it("should send notification with correct URL normalization (no trailing slash)", async () => {
    const ctx = createMockContext();
    const service = new MisskeyNotificationService(ctx, mockConfig);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      statusText: "OK",
    });

    await service.send({
      sourceId: "github",
      content: "Test notification",
    });

    expect(fetchMock).toHaveBeenCalledWith("https://misskey.example.com/api/notes/create", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Test notification",
        visibility: "home",
      }),
    });
  });

  it("should send notification with correct URL normalization (with trailing slash)", async () => {
    const ctx = createMockContext();
    const configWithTrailingSlash = {
      ...mockConfig,
      config: {
        ...mockConfig.config,
        url: "https://misskey.example.com/",
      },
    };
    const service = new MisskeyNotificationService(ctx, configWithTrailingSlash);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      statusText: "OK",
    });

    await service.send({
      sourceId: "github",
      content: "Test notification",
    });

    expect(fetchMock).toHaveBeenCalledWith("https://misskey.example.com/api/notes/create", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Test notification",
        visibility: "home",
      }),
    });
  });

  it("should log error when response is not ok", async () => {
    const ctx = createMockContext();
    const service = new MisskeyNotificationService(ctx, mockConfig);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: "Bad Request",
    });

    await service.send({
      sourceId: "github",
      content: "Test notification",
    });

    expect(ctx.var.logger.error).toHaveBeenCalledWith("Bad Request", "error");
  });

  it("should log error when fetch throws", async () => {
    const ctx = createMockContext();
    const service = new MisskeyNotificationService(ctx, mockConfig);

    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    await service.send({
      sourceId: "github",
      content: "Test notification",
    });

    expect(ctx.var.logger.error).toHaveBeenCalledWith("Error sending notification: Error: Network error", "error");
  });

  it("should log payload when debug.printPayload is true", async () => {
    const ctx = createMockContext();
    const configWithDebug = {
      ...mockConfig,
      options: {
        debug: {
          printPayload: true,
        },
      },
    };
    const service = new MisskeyNotificationService(ctx, configWithDebug);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      statusText: "OK",
    });

    await service.send({
      sourceId: "github",
      content: "Test notification",
    });

    expect(ctx.var.logger.info).toHaveBeenCalledWith(
      "payload: ",
      JSON.stringify({
        sourceId: "github",
        content: "Test notification",
      }),
    );
  });

  it("should send with correct headers and body structure", async () => {
    const ctx = createMockContext();
    const service = new MisskeyNotificationService(ctx, mockConfig);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      statusText: "OK",
    });

    await service.send({
      sourceId: "github",
      content: "Test with special chars: 日本語",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[1].headers.Authorization).toBe("Bearer test-token");
    expect(callArgs[1].headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(callArgs[1].body);
    expect(body.text).toBe("Test with special chars: 日本語");
    expect(body.visibility).toBe("home");
  });
});
