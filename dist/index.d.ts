interface WebhookPayload {
    channel?: string;
    username?: string;
    icon_url?: string;
    text?: string;
    [key: string]: unknown;
}
interface ActionConfig {
    webhookURL: string;
    channel: string;
    username: string;
    icon: string;
    text: string;
    payload: string;
    filename: string;
}
export declare function parsePayloadInput(raw: string): WebhookPayload;
export declare function buildTextPayload(channel: string, username: string, icon: string, text: string): WebhookPayload;
export declare function resolveMessage(config: ActionConfig): Promise<WebhookPayload>;
export {};
