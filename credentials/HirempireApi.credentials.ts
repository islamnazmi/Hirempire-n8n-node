import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class HirempireApi implements ICredentialType {
	name = 'hirempireApi';

	displayName = 'Hirempire API';

	documentationUrl = 'https://docs.hirempire.com/developers/auth';

	icon: Icon = 'file:icons/hirempire.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your Hirempire API token (usually starts with "sk"). Generate one in Hirempire under Settings → API Tokens.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.hirempire.com/v1',
			url: '/n8n/verify-credentials',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'reason',
					value: 'invalid_token',
					message: 'Invalid API token. Generate a new one in Hirempire under Settings → API Tokens.',
				},
			},
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'reason',
					value: 'forbidden',
					message: 'This API token does not have permission to access n8n integrations.',
				},
			},
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'reason',
					value: 'expired',
					message: 'API token has expired. Generate a new one in Hirempire under Settings → API Tokens.',
				},
			},
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'ok',
					value: false,
					message: 'Hirempire rejected the credentials. Verify the token is correct and active.',
				},
			},
		],
	};
}
