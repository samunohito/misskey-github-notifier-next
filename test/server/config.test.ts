import { describe, expect, it } from "vitest";
import { configLoader } from "../../src/server/config";
import type { Config } from "../../src/server/types";

describe("configLoader", () => {
  describe("Reading from environment variables", () => {
    it("should load GitHub webhook source config from environment variables", () => {
      // Setup environment variables
      const envVars = {
        ENV_SOURCE_GITHUB_TYPE: "github-webhook",
        ENV_SOURCE_GITHUB_ENABLED: "true",
        ENV_SOURCE_GITHUB_NOTIFY_TO: "misskey-dest",
        ENV_SOURCE_GITHUB_OPTIONS_DEBUG_PRINT_PAYLOAD: "true",
        ENV_SOURCE_GITHUB_CONFIG_WEBHOOK_SECRET: "test-secret",
        "ENV_DESTINATION_MISSKEY-DEST_TYPE": "misskey",
        "ENV_DESTINATION_MISSKEY-DEST_ENABLED": "true",
        "ENV_DESTINATION_MISSKEY-DEST_CONFIG_URL": "https://example.com",
        "ENV_DESTINATION_MISSKEY-DEST_CONFIG_TOKEN": "test-token",
        "ENV_DESTINATION_MISSKEY-DEST_CONFIG_DEFAULT_POST_VISIBILITY": "home",
      };

      // Call the configLoader
      const config = configLoader(envVars);

      // Verify the result
      expect(config).toBeDefined();
      expect(config.sources).toBeDefined();
      expect(config.sources?.github).toBeDefined();
      expect(config.sources?.github.type).toBe("github-webhook");
      expect(config.sources?.github.enabled).toBe(true);
      expect(config.sources?.github.notifyTo).toEqual(["misskey-dest"]);
      expect(config.sources?.github.options.debug.printPayload).toBe(true);
      expect(config.sources?.github.config.webhookSecret).toBe("test-secret");

      expect(config.destinations).toBeDefined();
      expect(config.destinations?.["misskey-dest"]).toBeDefined();
      expect(config.destinations?.["misskey-dest"].type).toBe("misskey");
      expect(config.destinations?.["misskey-dest"].enabled).toBe(true);
      expect(config.destinations?.["misskey-dest"].config.url).toBe("https://example.com");
      expect(config.destinations?.["misskey-dest"].config.token).toBe("test-token");
      expect(config.destinations?.["misskey-dest"].config.defaultPostVisibility).toBe("home");
    });

    it("should throw error when required config is missing", () => {
      // Setup environment variables with missing required field
      const envVars = {
        ENV_SOURCE_GITHUB_TYPE: "github-webhook",
        ENV_SOURCE_GITHUB_ENABLED: "true",
        ENV_SOURCE_GITHUB_NOTIFY_TO: "misskey-dest",
        // Missing webhook secret
        "ENV_DESTINATION_MISSKEY-DEST_TYPE": "misskey",
        "ENV_DESTINATION_MISSKEY-DEST_ENABLED": "true",
        "ENV_DESTINATION_MISSKEY-DEST_CONFIG_URL": "https://example.com",
        "ENV_DESTINATION_MISSKEY-DEST_CONFIG_TOKEN": "test-token",
      };

      // Expect the configLoader to throw an error
      expect(() => configLoader(envVars)).toThrow();
    });
  });

  describe("Reading from CONFIG object", () => {
    it("should load config from CONFIG object", () => {
      // Setup CONFIG object
      const configObject: Config = {
        sources: {
          github: {
            id: "github",
            type: "github-webhook",
            enabled: true,
            notifyTo: ["misskey-dest"],
            options: {
              debug: {
                printPayload: true,
              },
            },
            config: {
              webhookSecret: "test-secret-from-config",
            },
          },
        },
        destinations: {
          "misskey-dest": {
            id: "misskey-dest",
            type: "misskey",
            enabled: true,
            options: {
              debug: {
                printPayload: false,
              },
            },
            config: {
              url: "https://example.com/from-config",
              token: "test-token-from-config",
              defaultPostVisibility: "home",
            },
          },
        },
      };

      // Call the configLoader
      const config = configLoader({
        CONFIG: configObject,
      });

      // Verify the result
      expect(config).toBeDefined();
      expect(config.sources?.github.type).toBe("github-webhook");
      expect(config.sources?.github.enabled).toBe(true);
      expect(config.sources?.github.notifyTo).toEqual(["misskey-dest"]);
      expect(config.sources?.github.options.debug.printPayload).toBe(true);
      expect(config.sources?.github.config.webhookSecret).toBe("test-secret-from-config");

      expect(config.destinations?.["misskey-dest"].type).toBe("misskey");
      expect(config.destinations?.["misskey-dest"].enabled).toBe(true);
      expect(config.destinations?.["misskey-dest"].config.url).toBe("https://example.com/from-config");
      expect(config.destinations?.["misskey-dest"].config.token).toBe("test-token-from-config");
      expect(config.destinations?.["misskey-dest"].config.defaultPostVisibility).toBe("home");
    });

    it("should merge CONFIG object with environment variables", () => {
      // Setup environment variables
      const envVars = {
        ENV_SOURCE_GITHUB_CONFIG_WEBHOOK_SECRET: "test-secret-from-env",
        "ENV_DESTINATION_MISSKEY-DEST_CONFIG_TOKEN": "test-token-from-env",
        CONFIG: {
          sources: {
            github: {
              type: "github-webhook",
              enabled: true,
              notifyTo: ["misskey-dest"],
              options: {
                debug: {
                  printPayload: true,
                },
              },
              config: {
                // This will be overridden by environment variable
                webhookSecret: "test-secret-from-config",
              },
            },
          },
          destinations: {
            "misskey-dest": {
              type: "misskey",
              enabled: true,
              options: {
                debug: {
                  printPayload: false,
                },
              },
              config: {
                url: "https://example.com/from-config",
                // This will be overridden by environment variable
                token: "test-token-from-config",
                defaultPostVisibility: "home",
              },
            },
          },
        },
      };

      // Call the configLoader
      const config = configLoader(envVars);

      // Verify the result
      expect(config).toBeDefined();
      // Environment variable should override CONFIG
      expect(config.sources?.github.config.webhookSecret).toBe("test-secret-from-env");

      // Environment variable should override CONFIG
      expect(config.destinations?.["misskey-dest"].config.token).toBe("test-token-from-env");
      // Other values should come from CONFIG
      expect(config.destinations?.["misskey-dest"].config.url).toBe("https://example.com/from-config");
    });
  });
});
