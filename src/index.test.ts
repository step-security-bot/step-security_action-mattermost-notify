import * as core from '@actions/core'
import {
  parsePayloadInput,
  buildTextPayload,
  resolveMessage
} from './index'

jest.mock('@actions/core')
jest.mock('@actions/http-client')
jest.mock('axios')
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn(),
  promises: {
    access: jest.fn().mockRejectedValue(Object.assign(new Error(), { code: 'ENOENT' })),
    readFile: jest.fn()
  },
  constants: { F_OK: 0 }
}))

const mockDebug = core.debug as jest.Mock

describe('parsePayloadInput', () => {
  beforeEach(() => jest.clearAllMocks())

  it('parses a valid JSON string into an object', () => {
    const raw = '{"text":"hello","channel":"general"}'
    const result = parsePayloadInput(raw)
    expect(result).toEqual({ text: 'hello', channel: 'general' })
  })

  it('logs a debug message', () => {
    parsePayloadInput('{"text":"hi"}')
    expect(mockDebug).toHaveBeenCalledWith('Sending raw PAYLOAD input to Mattermost.')
  })

  it('throws on invalid JSON', () => {
    expect(() => parsePayloadInput('not-json')).toThrow()
  })
})

describe('buildTextPayload', () => {
  beforeEach(() => jest.clearAllMocks())

  it('builds a payload from the four arguments', () => {
    const result = buildTextPayload('alerts', 'bot', 'https://example.com/icon.png', 'Deploy done')
    expect(result).toEqual({
      channel: 'alerts',
      username: 'bot',
      icon_url: 'https://example.com/icon.png',
      text: 'Deploy done'
    })
  })

  it('logs a debug message', () => {
    buildTextPayload('ch', 'u', 'i', 't')
    expect(mockDebug).toHaveBeenCalledWith('Composing message from TEXT input.')
  })

  it('preserves empty string values', () => {
    const result = buildTextPayload('', '', '', 'message only')
    expect(result.channel).toBe('')
    expect(result.username).toBe('')
    expect(result.icon_url).toBe('')
    expect(result.text).toBe('message only')
  })
})

describe('resolveMessage', () => {
  beforeEach(() => jest.clearAllMocks())

  const baseConfig = {
    webhookURL: 'https://hooks.example.com/webhook',
    channel: 'general',
    username: 'bot',
    icon: 'https://example.com/icon.png',
    text: '',
    payload: '',
    filename: 'mattermost.json'
  }

  it('uses PAYLOAD when provided', async () => {
    const config = { ...baseConfig, payload: '{"text":"from payload"}' }
    const result = await resolveMessage(config)
    expect(result).toEqual({ text: 'from payload' })
  })

  it('uses TEXT when PAYLOAD is empty', async () => {
    const config = { ...baseConfig, text: 'hello from text' }
    const result = await resolveMessage(config)
    expect(result).toEqual({
      channel: 'general',
      username: 'bot',
      icon_url: 'https://example.com/icon.png',
      text: 'hello from text'
    })
  })

  it('throws when neither TEXT nor PAYLOAD is set', async () => {
    await expect(resolveMessage(baseConfig)).rejects.toThrow(
      'Either TEXT or PAYLOAD input must be specified'
    )
  })

  it('prefers PAYLOAD over TEXT when both are set', async () => {
    const config = {
      ...baseConfig,
      payload: '{"text":"from payload"}',
      text: 'from text'
    }
    const result = await resolveMessage(config)
    expect(result).toEqual({ text: 'from payload' })
  })
})
