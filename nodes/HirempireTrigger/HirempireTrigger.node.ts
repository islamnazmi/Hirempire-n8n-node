import type {
	IDataObject,
	IHookFunctions,
	IHttpRequestOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

const BASE_URL = 'https://api.hirempire.com/v1';

// n8n exposes only the URL for the current mode (test vs production), but the
// Hirempire API needs both registered so events flow whether the user is
// listening for a test event or running the activated workflow. Derive the
// twin URL by swapping the `/v1/` and `/v1-test/` prefixes. Falls back to
// the single URL if the pattern doesn't match (e.g. someone overrides n8n's
// WEBHOOK_URL with a different scheme).
function deriveBothUrls(url: string): string[] {
	const testMatch = url.match(/^(https?:\/\/[^/]+)\/v1-test\/(.+)$/);
	if (testMatch) {
		return [`${testMatch[1]}/v1/${testMatch[2]}`, url];
	}
	const prodMatch = url.match(/^(https?:\/\/[^/]+)\/v1\/(.+)$/);
	if (prodMatch) {
		return [url, `${prodMatch[1]}/v1-test/${prodMatch[2]}`];
	}
	return [url];
}

const EVENT_OPTIONS = [
	{ name: 'Applicant Applied', value: 'applicant_applied', description: 'A candidate applied to one of your jobs' },
	{ name: 'CV Upload Completed', value: 'cv_upload_completed', description: 'CV processing and analysis finished' },
	{ name: 'Job Activated', value: 'job_activated', description: 'A job was made active' },
	{ name: 'Job Added', value: 'job_added', description: 'A new job was published' },
	{ name: 'Job Deactivated', value: 'job_deactivated', description: 'A job is no longer active' },
	{ name: 'Job Deleted', value: 'job_deleted', description: 'A job was permanently removed' },
	{ name: 'Meeting Booked', value: 'meeting_booked', description: 'A meeting was scheduled via Hirempire' },
];

export class HirempireTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hirempire Trigger',
		name: 'hirempireTrigger',
		icon: 'file:hirempire.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Hirempire events occur',
		defaults: {
			name: 'Hirempire Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hirempireApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The Hirempire events to subscribe to',
				options: EVENT_OPTIONS,
			},
		],
		usableAsTool: true,
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const urls = deriveBothUrls(this.getNodeWebhookUrl('default') as string);

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'hirempireApi',
					{
						method: 'GET',
						url: `${BASE_URL}/n8n/webhook`,
						json: true,
					},
				)) as IDataObject;

				const webhooks = (response.data as IDataObject[]) ?? [];

				return urls.every((url) =>
					webhooks.some(
						(hook) => hook.request_url === url && hook.active === true,
					),
				);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const urls = deriveBothUrls(this.getNodeWebhookUrl('default') as string);
				const events = this.getNodeParameter('events') as string[];

				// Pull the full list once so we can decide per-URL whether to PATCH or POST.
				// Reusing a previously deactivated webhook for the same URL avoids leaking
				// inactive rows on Hirempire's side, since there is no delete endpoint.
				const list = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'hirempireApi',
					{
						method: 'GET',
						url: `${BASE_URL}/n8n/webhook`,
						json: true,
					},
				)) as IDataObject;
				const webhooks = (list.data as IDataObject[]) ?? [];

				for (const url of urls) {
					const existing = webhooks.find((hook) => hook.request_url === url);
					if (existing) {
						await this.helpers.httpRequestWithAuthentication.call(this, 'hirempireApi', {
							method: 'PATCH',
							url: `${BASE_URL}/n8n/webhook`,
							body: { id: existing.id, events, active: true },
							json: true,
						});
					} else {
						await this.helpers.httpRequestWithAuthentication.call(this, 'hirempireApi', {
							method: 'POST',
							url: `${BASE_URL}/n8n/webhook`,
							body: { request_url: url, events },
							json: true,
						});
					}
				}

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const urls = deriveBothUrls(this.getNodeWebhookUrl('default') as string);

				const list = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'hirempireApi',
					{
						method: 'GET',
						url: `${BASE_URL}/n8n/webhook`,
						json: true,
					},
				)) as IDataObject;
				const webhooks = (list.data as IDataObject[]) ?? [];

				// Deactivate each known URL; missing rows are fine (already gone).
				// The Hirempire API has no delete-webhook endpoint, so we PATCH to inactive.
				for (const url of urls) {
					const existing = webhooks.find((hook) => hook.request_url === url);
					if (!existing) continue;
					try {
						await this.helpers.httpRequestWithAuthentication.call(this, 'hirempireApi', {
							method: 'PATCH',
							url: `${BASE_URL}/n8n/webhook`,
							body: { id: existing.id, active: false },
							json: true,
						} as IHttpRequestOptions);
					} catch {
						return false;
					}
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;

		// Respond to the verification handshake by echoing the challenge value.
		if (body.type === 'url_verification' && body.challenge !== undefined) {
			const res = this.getResponseObject();
			res.status(200).json({ challenge: body.challenge });
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
