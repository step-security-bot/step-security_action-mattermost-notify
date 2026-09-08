import * as core from '@actions/core'
import { HttpClient } from '@actions/http-client'
import * as path from 'path'
import * as fs from 'fs'
import axios, { isAxiosError } from 'axios'

interface WebhookPayload {
  channel?: string
  username?: string
  icon_url?: string
  text?: string
  [key: string]: unknown
}

interface ActionConfig {
  webhookURL: string
  channel: string
  username: string
  icon: string
  text: string
  payload: string
  filename: string
}

async function validateSubscription(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH
  let repoPrivate: boolean | undefined

  if (eventPath && fs.existsSync(eventPath)) {
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'))
    repoPrivate = eventData?.repository?.private
  }

  const upstream = 'mattermost/action-mattermost-notify';
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl = 'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';

  core.info('');
  core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m');
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false) core.info('\u001b[32m\u2713 Free for public repositories\u001b[0m');
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  core.info('');

  if (repoPrivate === false) return;

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const body: Record<string, string> = { action: action || '' };
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body, { timeout: 3000 }
    );
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(`\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`);
      core.error(`\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`);
      process.exit(1);
    }
    core.info('Timeout or API not reachable. Continuing to next step.');
  }
}

function loadConfiguration(): ActionConfig {
  return {
    webhookURL: core.getInput('MATTERMOST_WEBHOOK_URL', { required: true }),
    channel: core.getInput('MATTERMOST_CHANNEL'),
    username: core.getInput('MATTERMOST_USERNAME'),
    icon: core.getInput('MATTERMOST_ICON_URL'),
    text: core.getInput('TEXT'),
    payload: core.getInput('PAYLOAD'),
    filename: core.getInput('PAYLOAD_FILENAME')
  }
}

async function loadPayloadFile(
  filename: string
): Promise<WebhookPayload | undefined> {
  const workspace = path.resolve(__dirname, '..')
  const filePath = path.resolve(workspace, filename)

  if (!filePath.startsWith(workspace + path.sep)) {
    throw new Error(`PAYLOAD_FILENAME must be a path within the workspace, got: ${filename}`)
  }

  try {
    await fs.promises.access(filePath, fs.constants.F_OK)
    const legacyData = await fs.promises.readFile(filePath)
    return legacyData as unknown as WebhookPayload
  } catch (e: unknown) {
    const errno = (e as NodeJS.ErrnoException).code
    if (errno === 'ENOENT' || errno === 'EISDIR') {
      core.debug(`No file found at ${filePath}, skipping legacy payload.`)
      return undefined
    }
    throw new Error(`Failed to read payload file: ${e}`)
  }
}

export function parsePayloadInput(raw: string): WebhookPayload {
  core.debug('Sending raw PAYLOAD input to Mattermost.')
  return JSON.parse(raw) as WebhookPayload
}

export function buildTextPayload(
  channel: string,
  username: string,
  icon: string,
  text: string
): WebhookPayload {
  core.debug('Composing message from TEXT input.')
  return { channel, username, icon_url: icon, text }
}

export async function resolveMessage(config: ActionConfig): Promise<WebhookPayload> {
  const fromFile = await loadPayloadFile(config.filename)
  if (fromFile !== undefined) return fromFile

  if (config.payload !== '') return parsePayloadInput(config.payload)

  if (config.text !== '')
    return buildTextPayload(config.channel, config.username, config.icon, config.text)

  throw new Error('Either TEXT or PAYLOAD input must be specified')
}

async function deliverWebhook(
  url: string,
  body: WebhookPayload
): Promise<void> {
  const client = new HttpClient()
  const res = await client.post(url, JSON.stringify(body))
  await res.readBody()

  const { statusCode, statusMessage } = res.message
  if (statusCode !== 200) {
    core.error(`Webhook responded with unexpected status: ${statusCode}`)
    throw new Error(`${statusMessage}`)
  }
  core.info('Mattermost message delivered.')
}

async function main(): Promise<void> {
  try {
    await validateSubscription()
    const config = loadConfiguration()
    const message = await resolveMessage(config)
    core.debug(JSON.stringify(message, undefined, 4))
    await deliverWebhook(config.webhookURL, message)
  } catch (e) {
    if (e instanceof Error) core.setFailed(e.message)
  }
}

main()
