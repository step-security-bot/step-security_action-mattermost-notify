[![StepSecurity Maintained Action](https://raw.githubusercontent.com/step-security/maintained-actions-assets/main/assets/maintained-action-banner.png)](https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions)

# action-mattermost-notify

A GitHub Action that delivers messages to [Mattermost](https://mattermost.com) channels via incoming webhooks. Use it to keep your team informed about CI/CD pipeline outcomes, deployment events, security alerts, and any other workflow milestones — right inside Mattermost.

Supports plain text, Markdown, and fully custom JSON payloads.

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `MATTERMOST_WEBHOOK_URL` | yes | — | Webhook endpoint URL for your Mattermost instance |
| `MATTERMOST_CHANNEL` | no | — | Channel to post to. Overrides the webhook default |
| `MATTERMOST_USERNAME` | no | — | Bot display name shown on the message |
| `MATTERMOST_ICON_URL` | no | — | Public URL of an image to use as the bot avatar |
| `TEXT` | no | — | Message body. Supports Mattermost Markdown |
| `PAYLOAD` | no | — | Raw JSON payload forwarded to the webhook as-is |
| `PAYLOAD_FILENAME` | no | `mattermost.json` | ⚠️ Deprecated. Use `TEXT` or `PAYLOAD` instead |

> Provide either `TEXT` or `PAYLOAD` — at least one is required.

---

## Quick start

Store your webhook URL as a repository secret (`MM_WEBHOOK_URL`), then add a step:

### Send a text message

```yaml
- name: Notify Mattermost
  uses: step-security/action-mattermost-notify@v2
  with:
    MATTERMOST_WEBHOOK_URL: ${{ secrets.MM_WEBHOOK_URL }}
    MATTERMOST_CHANNEL: deployments
    MATTERMOST_USERNAME: GitHub Actions
    MATTERMOST_ICON_URL: https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png
    TEXT: |
      **${{ github.repository }}** — pipeline complete :white_check_mark:
      [View run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
```

### Send a custom JSON payload

Use `PAYLOAD` when you need attachments, fields, or any advanced Mattermost message format. See the [Mattermost incoming webhook docs](https://developers.mattermost.com/integrate/webhooks/incoming/) for the full schema.

```yaml
- name: Notify Mattermost
  uses: step-security/action-mattermost-notify@v2
  with:
    MATTERMOST_WEBHOOK_URL: ${{ secrets.MM_WEBHOOK_URL }}
    PAYLOAD: |
      {
        "channel": "deployments",
        "username": "GitHub Actions",
        "text": "### ${{ github.repository }} deployed to production",
        "attachments": [{
          "color": "#36a64f",
          "text": "Triggered by @${{ github.triggering_actor }}"
        }]
      }
```

### Notify on failure only

```yaml
- name: Notify on failure
  if: failure()
  uses: step-security/action-mattermost-notify@v2
  with:
    MATTERMOST_WEBHOOK_URL: ${{ secrets.MM_WEBHOOK_URL }}
    MATTERMOST_CHANNEL: alerts
    TEXT: |
      :red_circle: **Build failed** in `${{ github.repository }}`
      Branch: `${{ github.ref_name }}` — [View run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})
```

---

## Building from source

```bash
npm install
npm run build
```

The compiled action is written to `dist/index.js`. Commit the `dist/` directory alongside your source changes.

---

## License

See [LICENSE](LICENSE).
