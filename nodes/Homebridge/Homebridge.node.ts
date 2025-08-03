import { INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { 
	authOperations, 
	authFields,
	serverOperations,
	serverFields,
	configOperations,
	configFields,
	pluginOperations,
	pluginFields,
	accessoryOperations,
	accessoryFields,
	userOperations,
	userFields,
	statusOperations,
	statusFields,
	platformOperations,
	platformFields,
	backupOperations,
	backupFields,
	setupOperations,
	setupFields
} from './HomebridgeDescription';

export class Homebridge implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Homebridge',
		name: 'homebridge',
		icon: { light: 'file:homebridge-logo.svg', dark: 'file:homebridge-logo.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Homebridge API',
		defaults: {
			name: 'Homebridge',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'homebridgeApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials?.serverUrl}}',
			url: '',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Accessory',
						value: 'accessories',
						description: 'Control HomeKit accessories',
					},
					{
						name: 'Authentication',
						value: 'auth',
						description: 'Manage authentication and login',
					},
					{
						name: 'Backup & Restore',
						value: 'backup',
						description: 'Backup and restore operations',
					},
					{
						name: 'Config Editor',
						value: 'config',
						description: 'Manage Homebridge configuration',
					},
					{
						name: 'Platform Tool',
						value: 'platform',
						description: 'Platform-specific operations',
					},
					{
						name: 'Plugin',
						value: 'plugins',
						description: 'Manage Homebridge plugins',
					},
					{
						name: 'Server',
						value: 'server',
						description: 'Control Homebridge server and bridges',
					},
					{
						name: 'Setup Wizard',
						value: 'setup',
						description: 'Initial setup operations',
					},
					{
						name: 'Status',
						value: 'status',
						description: 'Get system status information',
					},
					{
						name: 'User',
						value: 'users',
						description: 'Manage user accounts',
					},
				],
				default: 'auth',
			},

			// Authentication operations and fields
			...authOperations,
			...authFields,

			// Server operations and fields
			...serverOperations,
			...serverFields,

			// Config operations and fields
			...configOperations,
			...configFields,

			// Plugin operations and fields
			...pluginOperations,
			...pluginFields,

			// Accessory operations and fields
			...accessoryOperations,
			...accessoryFields,

			// User operations and fields
			...userOperations,
			...userFields,

			// Status operations and fields
			...statusOperations,
			...statusFields,

			// Platform operations and fields
			...platformOperations,
			...platformFields,

			// Backup operations and fields
			...backupOperations,
			...backupFields,

			// Setup operations and fields
			...setupOperations,
			...setupFields,
		],
	};
}