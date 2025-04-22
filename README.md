# Misskey GitHub Notifier Next

A service that forwards GitHub webhook events to Misskey as notes. This allows you to receive notifications about repository activities directly on your Misskey timeline.

## Features

- Forwards various GitHub webhook events to Misskey
- Supports multiple event types:
  - Repository events (push, star, fork)
  - Issue events (open, close, reopen, comment)
  - Pull request events (open, close, merge, review)
  - Release events
  - Discussion events
- Formats messages with appropriate emojis and links
- Secure webhook validation

## Operating Environment

- **Primary Platform**: Designed to run on [Cloudflare Workers](https://workers.cloudflare.com/)
- **Alternative Runtime**: Also works with [Bun](https://bun.sh/)
- **Node.js Support**: Node.js compatibility can be added upon request

## Configuration

The service is configured using environment variables:

### GitHub Configuration

| Environment Variable | Description | Required |
|----------------------|-------------|----------|
| `ENV_SENDER_GITHUB_WEBHOOK_SECRET` | Secret for GitHub webhook authentication | Yes |

### Misskey Configuration

| Environment Variable | Description | Default | Required |
|----------------------|-------------|---------|----------|
| `ENV_NOTIFY_TO_MISSKEY_ENABLED` | Enable/disable Misskey notifications | `true` | No |
| `ENV_NOTIFY_TO_MISSKEY_URL` | Misskey instance URL | - | Yes |
| `ENV_NOTIFY_TO_MISSKEY_TOKEN` | Misskey API token | - | Yes |
| `ENV_NOTIFY_TO_MISSKEY_DEFAULT_POST_VISIBILITY` | Default visibility for posts (`public`, `home`, `followers`, or `specified`) | `home` | No |

### Server Configuration

| Environment Variable | Description | Default | Required |
|----------------------|-------------|---------|----------|
| `SERVER_PORT` | Port for the server when running in Bun | `8080` | No |

### Debug Options

| Environment Variable | Description | Default | Required |
|----------------------|-------------|---------|----------|
| `ENV_OPTION_GITHUB_WEBHOOK_PRINT_PAYLOAD` | Print webhook payloads for debugging | `false` | No |

## Setup

1. Deploy to Cloudflare Workers or run with Bun
2. Configure the environment variables
3. Set up a GitHub webhook pointing to your deployment URL with path `/github/webhook`
4. Select the events you want to receive notifications for

## Issues and Feature Requests

If you encounter any bugs or have ideas for new features, please open an issue on the GitHub repository.

## Contributing

Detailed contribution guidelines have not been established yet. However, pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT