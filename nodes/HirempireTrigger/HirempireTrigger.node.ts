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
				const webhookUrl = this.getNodeWebhookUrl('default');

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
				return webhooks.some(
					(hook) => hook.request_url === webhookUrl && hook.active === true,
				);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];

				// PATCH an existing (likely-inactive) row for the same URL if there is
				// one, otherwise POST a new one. checkExists only returns true for
				// active rows, so a present-but-inactive row falls through to here.
				const list = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'hirempireApi',
					{
						method: 'GET',
						url: `${BASE_URL}/n8n/webhook`,
						json: true,
					},
				)) as IDataObject;
				const existing = ((list.data as IDataObject[]) ?? []).find(
					(hook) => hook.request_url === webhookUrl,
				);

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
						body: { request_url: webhookUrl, events },
						json: true,
					});
				}

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const list = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'hirempireApi',
					{
						method: 'GET',
						url: `${BASE_URL}/n8n/webhook`,
						json: true,
					},
				)) as IDataObject;
				const existing = ((list.data as IDataObject[]) ?? []).find(
					(hook) => hook.request_url === webhookUrl,
				);

				if (!existing) return true;

				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'hirempireApi', {
						method: 'DELETE',
						url: `${BASE_URL}/n8n/webhook`,
						qs: { id: existing.id },
						json: true,
					} as IHttpRequestOptions);
				} catch {
					return false;
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
