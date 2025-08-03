import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HomebridgeApi implements ICredentialType {
	name = 'homebridgeApi';
	displayName = 'Homebridge API';
	documentationUrl = 'https://github.com/homebridge/homebridge-config-ui-x/wiki/API-Reference';
	
	properties: INodeProperties[] = [
		{
			displayName: 'Server URL',
			name: 'serverUrl',
			type: 'string',
			default: '',
			placeholder: 'http://your-homebridge-server:8581',
			description: 'The URL of your Homebridge server (including port)',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Homebridge username',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Homebridge password',
		},
		{
			displayName: 'Two-Factor Authentication Code',
			name: 'otp',
			type: 'string',
			default: '',
			description: 'Optional: 2FA code if enabled on your account',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials?.serverUrl}}',
			url: '/api/auth/settings',
			method: 'GET',
		},
	};
}