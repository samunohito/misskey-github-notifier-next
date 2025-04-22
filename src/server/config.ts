import { type Config, type DestinationConfigItem, type Environment, type SourceConfigItem, misskeyPostVisibilities } from "@notifier/server/types";
import type { RecursivePartial } from "@notifier/utils/types";

function require<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

function match<T>(value: unknown, sources: T[]): T {
  if (sources.includes(value as T)) {
    return value as T;
  }
  throw new Error(`Invalid value: ${value}`);
}

function cyclicMerge<T extends Record<string, unknown>>(target: T, source: T): T {
  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === "object" && !Array.isArray(source[key])) {
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        target[key] = cyclicMerge(target[key] || ({} as any), source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

export type IntermediateSourceConfigItem = RecursivePartial<
  Omit<SourceConfigItem<unknown>, "id" | "type"> & {
    type?: string;
  }
>;

function parseSourcesFromEnv(c: Record<string, unknown>): Record<string, IntermediateSourceConfigItem> {
  const sources: Record<string, IntermediateSourceConfigItem> = {};

  // Parse sources from environment variables
  // Format: ENV_SOURCE_<ID>_<PROPERTY>
  const extractRegexPattern = /^ENV_SOURCE_([0-9a-zA-Z-]+)_(.+)$/;
  for (const key of Object.keys(c).filter((it) => extractRegexPattern.test(it))) {
    const match = key.match(extractRegexPattern);
    if (!match) {
      // 通常あり得ない
      continue;
    }

    const sourceId = match[1].toLowerCase();
    const propertyPath = match[2].toLowerCase();

    if (!sources[sourceId]) {
      sources[sourceId] = {};
    }

    // Handle nested properties
    const current = sources[sourceId];
    switch (true) {
      case propertyPath === "type": {
        current.type = c[key]?.toString();
        break;
      }
      case propertyPath === "enabled": {
        current.enabled = c[key] === "true";
        break;
      }
      case propertyPath === "notify_to": {
        current.notifyTo = c[key]
          ?.toString()
          .split(",")
          .map((it: string) => it.trim());
        break;
      }
      case propertyPath.startsWith("options_"): {
        current.options = current.options || {};
        const optionsPath = propertyPath.slice("options_".length);
        switch (true) {
          case optionsPath.startsWith("debug_"): {
            current.options.debug = current.options.debug || {};
            const debugPath = optionsPath.slice("debug_".length);
            switch (true) {
              case debugPath === "print_payload": {
                current.options.debug.printPayload = c[key] === "true";
                break;
              }
              default: {
                break;
              }
            }
            break;
          }
        }
        break;
      }
      case propertyPath.startsWith("config_"): {
        current.config = current.config || {};
        const configPath = propertyPath.slice("config_".length);
        switch (true) {
          case configPath === "webhook_secret": {
            current.config.webhookSecret = c[key]?.toString();
            break;
          }
          default: {
            break;
          }
        }
        break;
      }
    }
  }

  return sources;
}

function resolveSources(
  rawConfig: RecursivePartial<Config> | undefined,
  envSources: Record<string, IntermediateSourceConfigItem>,
): Record<string, SourceConfigItem<unknown>> {
  const merged: Record<string, IntermediateSourceConfigItem> = {};

  function mergeItems(items: Record<string, IntermediateSourceConfigItem>) {
    for (const [key, value] of Object.entries(items)) {
      if (value.type === "github-webhook" || merged[key]?.type === "github-webhook") {
        merged[key] = cyclicMerge(merged[key] ?? {}, value);
      }
    }
  }

  function resolveGitHubWebhook(key: string, value: IntermediateSourceConfigItem): SourceConfigItem<unknown> {
    return {
      id: key,
      type: "github-webhook",
      enabled: value.enabled ?? false,
      notifyTo: value.notifyTo ?? [],
      options: {
        debug: {
          printPayload: value.options?.debug?.printPayload ?? false,
        },
      },
      config: {
        webhookSecret: require(value.config?.webhookSecret, `webhookSecret is required for source ${key}`),
      },
    };
  }

  mergeItems(rawConfig?.sources || {});
  mergeItems(envSources);

  const validated: Record<string, SourceConfigItem<unknown>> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (value.type === "github-webhook") {
      validated[key] = resolveGitHubWebhook(key, value);
    }
  }

  return validated;
}

export type IntermediateDestinationConfigType = RecursivePartial<
  Omit<DestinationConfigItem<unknown>, "id" | "type"> & {
    type?: string;
  }
>;

function parseDestinationsFromEnv(c: Record<string, unknown>): Record<string, IntermediateDestinationConfigType> {
  const destinations: Record<string, IntermediateDestinationConfigType> = {};

  // Parse destinations from environment variables
  // Format: ENV_DESTINATION_<ID>_<PROPERTY>
  const extractRegexPattern = /^ENV_DESTINATION_([0-9a-zA-Z-]+)_(.+)$/;
  for (const key of Object.keys(c).filter((it) => extractRegexPattern.test(it))) {
    const match = key.match(extractRegexPattern);
    if (!match) {
      // 通常あり得ない
      continue;
    }

    const destinationId = match[1].toLowerCase();
    const propertyPath = match[2].toLowerCase();

    if (!destinations[destinationId]) {
      destinations[destinationId] = {};
    }

    // Handle nested properties
    const current = destinations[destinationId];
    switch (true) {
      case propertyPath === "type": {
        current.type = c[key]?.toString();
        break;
      }
      case propertyPath === "enabled": {
        current.enabled = c[key] === "true";
        break;
      }
      case propertyPath.startsWith("options_"): {
        current.options = current.options || {};
        const optionsPath = propertyPath.slice("options_".length);
        switch (true) {
          case optionsPath.startsWith("debug_"): {
            current.options.debug = current.options.debug || {};
            const debugPath = optionsPath.slice("debug_".length);
            switch (true) {
              case debugPath === "print_payload": {
                current.options.debug.printPayload = c[key] === "true";
                break;
              }
              default: {
                break;
              }
            }
            break;
          }
        }
        break;
      }
      case propertyPath.startsWith("config_"): {
        current.config = current.config || {};
        const configPath = propertyPath.slice("config_".length);
        switch (true) {
          case configPath === "url": {
            current.config.url = c[key]?.toString();
            break;
          }
          case configPath === "token": {
            current.config.token = c[key]?.toString();
            break;
          }
          case configPath === "default_post_visibility": {
            current.config.defaultPostVisibility = c[key]?.toString();
            break;
          }
          default: {
            break;
          }
        }
        break;
      }
    }
  }

  return destinations;
}

function resolveDestinations(
  rawConfig: RecursivePartial<Config> | undefined,
  envDestinations: Record<string, IntermediateDestinationConfigType>,
): Record<string, DestinationConfigItem<unknown>> {
  const merged: Record<string, IntermediateDestinationConfigType> = {};

  function mergeItems(items: Record<string, IntermediateDestinationConfigType>) {
    for (const [key, value] of Object.entries(items)) {
      if (value.type === "misskey" || merged[key]?.type === "misskey") {
        merged[key] = cyclicMerge(merged[key] ?? {}, value);
      }
    }
  }

  mergeItems(rawConfig?.destinations || {});
  mergeItems(envDestinations);

  function resolveMisskey(key: string, value: IntermediateDestinationConfigType): DestinationConfigItem<unknown> {
    return {
      id: key,
      type: "misskey",
      enabled: value.enabled ?? false,
      options: {
        debug: {
          printPayload: value.options?.debug?.printPayload ?? false,
        },
      },
      config: {
        url: require(value.config?.url, `url is required for destination ${key}`),
        token: require(value.config?.token, `token is required for destination ${key}`),
        defaultPostVisibility: value.config?.defaultPostVisibility ? match(value.config.defaultPostVisibility, misskeyPostVisibilities) : "home",
      },
    };
  }

  const validated: Record<string, DestinationConfigItem<unknown>> = {};
  for (const [key, value] of Object.entries(merged)) {
    if (value.type === "misskey") {
      validated[key] = resolveMisskey(key, value);
    }
  }

  return validated;
}

export function configLoader(c: Record<string, unknown> & Environment): Config {
  const sources = resolveSources(c.CONFIG, parseSourcesFromEnv(c));
  const destinations = resolveDestinations(c.CONFIG, parseDestinationsFromEnv(c));

  // 存在しない通知先を設定していないかのチェック
  const destinationKeys = Object.keys(destinations);
  for (const [key, source] of Object.entries(sources)) {
    if (source.notifyTo) {
      for (const notifyTo of source.notifyTo) {
        if (!destinationKeys.includes(notifyTo)) {
          throw new Error(`Invalid notifyTo destination: ${notifyTo} for source ${key}`);
        }
      }
    }
  }

  return {
    sources,
    destinations,
  };
}
