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
- Support for multiple sources and destinations

## Operating Environment

- **Primary Platform**: Designed to run on [Cloudflare Workers](https://workers.cloudflare.com/)
- **Alternative Runtime**: Also works with [Bun](https://bun.sh/)
- **Node.js Support**: Node.js compatibility can be added upon request

## Configuration

The service is configured using environment variables with a flexible ID-based system that allows for multiple sources and destinations.

### ID Format

- `<ID>` can contain alphanumeric characters and hyphens (`[0-9a-zA-Z-]`)
- Each source or destination must have a unique ID
- IDs are used to generate endpoints and link sources to destinations

### Source Configuration (GitHub Webhook)

| Environment Variable | Description | Default | Required |
|----------------------|-------------|---------|----------|
| `ENV_SOURCE_<ID>_TYPE` | Type of source (must be `github-webhook`) | - | Yes |
| `ENV_SOURCE_<ID>_ENABLED` | Enable/disable this source | `false` | No |
| `ENV_SOURCE_<ID>_NOTIFY_TO` | Comma-separated list of destination IDs to notify | - | Yes |
| `ENV_SOURCE_<ID>_CONFIG_WEBHOOK_SECRET` | Secret for GitHub webhook authentication | - | Yes |
| `ENV_SOURCE_<ID>_OPTIONS_DEBUG_PRINT_PAYLOAD` | Print webhook payloads for debugging | `false` | No |

### Destination Configuration (Misskey)

| Environment Variable | Description | Default | Required |
|----------------------|-------------|---------|----------|
| `ENV_DESTINATION_<ID>_TYPE` | Type of destination (must be `misskey`) | - | Yes |
| `ENV_DESTINATION_<ID>_ENABLED` | Enable/disable this destination | `false` | No |
| `ENV_DESTINATION_<ID>_CONFIG_URL` | Misskey instance URL | - | Yes |
| `ENV_DESTINATION_<ID>_CONFIG_TOKEN` | Misskey API token | - | Yes |
| `ENV_DESTINATION_<ID>_CONFIG_DEFAULT_POST_VISIBILITY` | Default visibility for posts (`public`, `home`, `followers`, or `specified`) | `home` | No |
| `ENV_DESTINATION_<ID>_OPTIONS_DEBUG_PRINT_PAYLOAD` | Print API request payloads for debugging | `false` | No |

### Server Configuration

| Environment Variable | Description | Default | Required |
|----------------------|-------------|---------|----------|
| `SERVER_PORT` | Port for the server when running in Bun | `8080` | No |

## Setup

1. Deploy to Cloudflare Workers or run with Bun
2. Configure the environment variables (see examples below)
3. Set up a GitHub webhook pointing to your deployment URL with path `/endpoint/<ID>` where `<ID>` is the source ID you configured
4. Select the events you want to receive notifications for

### Example Configuration

Here's an example of how to set up multiple sources and destinations:

#### Single Source with Single Destination

```
# Source configuration (GitHub repository "my-repo")
ENV_SOURCE_myrepo_TYPE=github-webhook
ENV_SOURCE_myrepo_ENABLED=true
ENV_SOURCE_myrepo_NOTIFY_TO=mymisskey
ENV_SOURCE_myrepo_CONFIG_WEBHOOK_SECRET=your-github-webhook-secret

# Destination configuration (Misskey instance)
ENV_DESTINATION_mymisskey_TYPE=misskey
ENV_DESTINATION_mymisskey_ENABLED=true
ENV_DESTINATION_mymisskey_CONFIG_URL=https://misskey.example.com
ENV_DESTINATION_mymisskey_CONFIG_TOKEN=your-misskey-api-token
ENV_DESTINATION_mymisskey_CONFIG_DEFAULT_POST_VISIBILITY=home
```

In this example, GitHub webhook events from "my-repo" will be sent to the Misskey instance at https://misskey.example.com.
The GitHub webhook should be configured to send events to `/endpoint/myrepo`.

#### Multiple Sources with Multiple Destinations

```
# Source configuration (GitHub repository "repo1")
ENV_SOURCE_repo1_TYPE=github-webhook
ENV_SOURCE_repo1_ENABLED=true
ENV_SOURCE_repo1_NOTIFY_TO=misskey1,misskey2
ENV_SOURCE_repo1_CONFIG_WEBHOOK_SECRET=webhook-secret-for-repo1

# Source configuration (GitHub repository "repo2")
ENV_SOURCE_repo2_TYPE=github-webhook
ENV_SOURCE_repo2_ENABLED=true
ENV_SOURCE_repo2_NOTIFY_TO=misskey2
ENV_SOURCE_repo2_CONFIG_WEBHOOK_SECRET=webhook-secret-for-repo2

# Destination configuration (Misskey instance 1)
ENV_DESTINATION_misskey1_TYPE=misskey
ENV_DESTINATION_misskey1_ENABLED=true
ENV_DESTINATION_misskey1_CONFIG_URL=https://misskey1.example.com
ENV_DESTINATION_misskey1_CONFIG_TOKEN=token-for-misskey1
ENV_DESTINATION_misskey1_CONFIG_DEFAULT_POST_VISIBILITY=home

# Destination configuration (Misskey instance 2)
ENV_DESTINATION_misskey2_TYPE=misskey
ENV_DESTINATION_misskey2_ENABLED=true
ENV_DESTINATION_misskey2_CONFIG_URL=https://misskey2.example.com
ENV_DESTINATION_misskey2_CONFIG_TOKEN=token-for-misskey2
ENV_DESTINATION_misskey2_CONFIG_DEFAULT_POST_VISIBILITY=followers
```

In this example:
- Events from "repo1" will be sent to both Misskey instances
- Events from "repo2" will be sent only to the second Misskey instance
- The GitHub webhooks should be configured to send events to `/endpoint/repo1` and `/endpoint/repo2` respectively

## Troubleshooting and Best Practices

### Troubleshooting

- **Webhook Not Working**: Ensure that your GitHub webhook is configured to send events to the correct endpoint (`/endpoint/<ID>`). Check the webhook secret matches the one in your environment variables.
- **No Notifications**: Verify that the source is enabled (`ENV_SOURCE_<ID>_ENABLED=true`) and that the destination is enabled (`ENV_DESTINATION_<ID>_ENABLED=true`).
- **Invalid Destination**: Make sure that the destination IDs in `ENV_SOURCE_<ID>_NOTIFY_TO` exist in your configuration.
- **Debug Mode**: Enable debug mode (`ENV_SOURCE_<ID>_OPTIONS_DEBUG_PRINT_PAYLOAD=true` and `ENV_DESTINATION_<ID>_OPTIONS_DEBUG_PRINT_PAYLOAD=true`) to see the payloads being received and sent.

### Best Practices

- **Unique IDs**: Use descriptive and unique IDs for your sources and destinations to avoid confusion.
- **Security**: Keep your webhook secrets and API tokens secure. Do not commit them to public repositories.
- **Visibility**: Choose the appropriate visibility level for your Misskey posts based on your privacy requirements.
- **Multiple Destinations**: You can send notifications from a single source to multiple destinations by separating the destination IDs with commas in the `ENV_SOURCE_<ID>_NOTIFY_TO` variable.

## Issues and Feature Requests

If you encounter any bugs or have ideas for new features, please open an issue on the GitHub repository.

## Contributing

Detailed contribution guidelines have not been established yet. However, pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
