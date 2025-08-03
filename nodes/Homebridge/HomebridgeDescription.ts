import { INodeProperties, IHttpRequestMethods } from 'n8n-workflow';

// Helper function to add authentication to requests
const addAuthToRequest = {
	send: {
		preSend: [
			async function(this: any, requestOptions: any) {
				// For login operation, credentials are required
				if (requestOptions.url?.includes('/api/auth/login')) {
					const credentials = await this.getCredentials('homebridgeApi');
					if (!credentials) {
						throw new Error('Homebridge credentials are required for login operation');
					}
					
					requestOptions.body = {
						username: this.getNodeParameter('additionalFields.username', 0) || credentials.username,
						password: this.getNodeParameter('additionalFields.password', 0) || credentials.password,
						...(this.getNodeParameter('additionalFields.otp', 0) && { otp: this.getNodeParameter('additionalFields.otp', 0) }),
					};
					return requestOptions;
				}

				// For all other operations, get token from previous login operation
				let accessToken = null;
				
				// Try to get token from input data
				try {
					const items = this.getInputData();
					if (items && items.length > 0) {
						// Look for access_token in the previous node's output
						for (const item of items) {
							if (item.json) {
								// Check if access_token is directly in the item
								if (item.json.access_token) {
									accessToken = item.json.access_token;
									break;
								}
								// Check if access_token is in an array (most common case)
								if (Array.isArray(item.json) && item.json.length > 0) {
									const firstItem = item.json[0];
									if (firstItem && firstItem.access_token) {
										accessToken = firstItem.access_token;
										break;
									}
								}
							}
						}
					}
				} catch (error) {
					// Ignore if no input data
				}
				
				// If no token from previous node, try to get it from user input
				if (!accessToken) {
					// Try to get token from user input field
					const userToken = this.getNodeParameter('accessToken', 0, '');
					if (userToken) {
						accessToken = userToken;
					} else {
						throw new Error('No access token available. Please either: 1) Connect the Login node to this node, or 2) Manually enter the access token in the "Access Token" field.');
					}
				}
				
				// Use the token for authorization
				requestOptions.headers = {
					...requestOptions.headers,
					'Authorization': `Bearer ${accessToken}`,
				};

				return requestOptions;
			},
		],
	},
};

// =============================================================================
// AUTHENTICATION OPERATIONS
// =============================================================================

export const authOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['auth'],
			},
		},
		options: [
			{
				name: 'Login',
				value: 'login',
				description: 'Exchange username and password for authentication token',
				action: 'Login to homebridge',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/auth/login',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Settings',
				value: 'getSettings',
				description: 'Get settings required to load UI before authentication',
				action: 'Get authentication settings',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/auth/settings',
					},
				},
			},
			{
				name: 'No Auth Token',
				value: 'noAuth',
				description: 'Get access token when authentication is disabled',
				action: 'Get no auth token',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/auth/noauth',
					},
				},
			},
			{
				name: 'Check Auth',
				value: 'checkAuth',
				description: 'Check if authentication token is still valid',
				action: 'Check authentication status',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/auth/check',
					},
					...addAuthToRequest,
				},
			},
		],
		default: 'login',
	},
];

export const authFields: INodeProperties[] = [
	{
		displayName: 'Additional Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Login Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['auth'],
				operation: ['login'],
			},
		},
		options: [
			{
				displayName: 'Access Token',
				name: 'accessToken',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'Access token from Login operation. If not connected to Login node, enter manually.',
			},
			{
				displayName: 'Override Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'Override the username from credentials',
			},
			{
				displayName: 'Override Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				description: 'Override the password from credentials',
			},
			{
				displayName: 'Two-Factor Code',
				name: 'otp',
				type: 'string',
				default: '',
				description: 'Two-factor authentication code',
			},
		],
	},
];

// =============================================================================
// SERVER OPERATIONS
// =============================================================================

export const serverOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['server'],
			},
		},
		options: [
			{
				name: 'Restart Server',
				value: 'restart',
				description: 'Restart the Homebridge instance',
				action: 'Restart homebridge server',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/server/restart',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Restart Child Bridge',
				value: 'restartChild',
				description: 'Restart a child bridge instance',
				action: 'Restart child bridge',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '=/api/server/restart/{{$parameter["deviceId"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Stop Child Bridge',
				value: 'stopChild',
				description: 'Stop a child bridge instance',
				action: 'Stop child bridge',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '=/api/server/stop/{{$parameter["deviceId"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Start Child Bridge',
				value: 'startChild',
				description: 'Start a child bridge instance',
				action: 'Start child bridge',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '=/api/server/start/{{$parameter["deviceId"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Pairing Info',
				value: 'getPairing',
				description: 'Get Homebridge &lt;&gt; HomeKit pairing information',
				action: 'Get pairing information',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/server/pairing',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Reset Homebridge Accessory',
				value: 'resetAccessory',
				description: 'Reset main bridge and change username/pin',
				action: 'Reset homebridge accessory',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/server/reset-homebridge-accessory',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Reset Cached Accessories',
				value: 'resetCache',
				description: 'Remove all cached accessories',
				action: 'Reset cached accessories',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/server/reset-cached-accessories',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Cached Accessories',
				value: 'getCachedAccessories',
				description: 'List cached Homebridge accessories',
				action: 'Get cached accessories',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/server/cached-accessories',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Delete Cached Accessories',
				value: 'deleteCachedAccessories',
				description: 'Remove multiple cached accessories',
				action: 'Delete cached accessories',
				routing: {
					request: {
						method: 'DELETE' as IHttpRequestMethods,
						url: '/api/server/cached-accessories',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Delete Cached Accessory',
				value: 'deleteCachedAccessory',
				description: 'Remove a single cached accessory',
				action: 'Delete cached accessory',
				routing: {
					request: {
						method: 'DELETE' as IHttpRequestMethods,
						url: '=/api/server/cached-accessories/{{$parameter["uuid"]}}?cacheFile={{$parameter["cacheFile"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Device Pairings',
				value: 'getDevicePairings',
				description: 'List all paired accessories',
				action: 'Get device pairings',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/server/pairings',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Device Pairing',
				value: 'getDevicePairing',
				description: 'Get a single device pairing',
				action: 'Get device pairing',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/server/pairings/{{$parameter["deviceId"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Delete Device Pairing',
				value: 'deleteDevicePairing',
				description: 'Remove a single paired bridge',
				action: 'Delete device pairing',
				routing: {
					request: {
						method: 'DELETE' as IHttpRequestMethods,
						url: '=/api/server/pairings/{{$parameter["deviceId"]}}?resetPairingInfo={{$parameter["resetPairingInfo"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Unused Port',
				value: 'getUnusedPort',
				description: 'Return a random, unused port',
				action: 'Get unused port',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/server/port/new',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Network Interfaces',
				value: 'getNetworkInterfaces',
				description: 'Get system network interfaces',
				action: 'Get network interfaces',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/server/network-interfaces/system',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Bridge Network Interfaces',
				value: 'getBridgeNetworkInterfaces',
				description: 'Get Homebridge network interfaces',
				action: 'Get bridge network interfaces',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/server/network-interfaces/bridge',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Set Bridge Network Interfaces',
				value: 'setBridgeNetworkInterfaces',
				description: 'Set Homebridge network interfaces',
				action: 'Set bridge network interfaces',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/server/network-interfaces/bridge',
					},
					...addAuthToRequest,
				},
			},
		],
		default: 'restart',
	},
];

export const serverFields: INodeProperties[] = [
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['server'],
			},
		},
		description: 'Access token from Login operation. If not connected to Login node, enter manually.',
	},
	{
		displayName: 'Device ID',
		name: 'deviceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['restartChild', 'stopChild', 'startChild', 'getDevicePairing', 'deleteDevicePairing'],
			},
		},
		description: 'The device ID of the child bridge',
	},
	{
		displayName: 'UUID',
		name: 'uuid',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['deleteCachedAccessory'],
			},
		},
		description: 'The UUID of the cached accessory',
	},
	{
		displayName: 'Cache File',
		name: 'cacheFile',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['deleteCachedAccessory'],
			},
		},
		description: 'The cache file path',
	},
	{
		displayName: 'Reset Pairing Info',
		name: 'resetPairingInfo',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['deleteDevicePairing'],
			},
		},
		description: 'Whether to reset pairing information',
	},
	{
		displayName: 'Network Adapters',
		name: 'adapters',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['setBridgeNetworkInterfaces'],
			},
		},
		default: {},
		options: [
			{
				name: 'adapter',
				displayName: 'Adapter',
				values: [
					{
						displayName: 'Interface Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Network interface name',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'adapters',
				value: '={{$parameter["adapters"]["adapter"].map(item => item.name)}}',
			},
		},
	},
	{
		displayName: 'Accessories to Delete',
		name: 'accessories',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['server'],
				operation: ['deleteCachedAccessories'],
			},
		},
		default: {},
		options: [
			{
				name: 'accessory',
				displayName: 'Accessory',
				values: [
					{
						displayName: 'UUID',
						name: 'uuid',
						type: 'string',
						default: '',
						description: 'Accessory UUID',
					},
					{
						displayName: 'Cache File',
						name: 'cacheFile',
						type: 'string',
						default: '',
						description: 'Cache file path',
					},
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				value: '={{$parameter["accessories"]["accessory"]}}',
			},
		},
	},
];

// =============================================================================
// CONFIG EDITOR OPERATIONS
// =============================================================================

export const configOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['config'],
			},
		},
		options: [
			{
				name: 'Get Config',
				value: 'getConfig',
				description: 'Get current Homebridge config.JSON',
				action: 'Get configuration',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/config-editor',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Update Config',
				value: 'updateConfig',
				description: 'Update Homebridge config.JSON',
				action: 'Update configuration',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/config-editor',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Plugin Config',
				value: 'getPluginConfig',
				description: 'Get config blocks for a specific plugin',
				action: 'Get plugin configuration',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/config-editor/plugin/{{$parameter["pluginName"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Update Plugin Config',
				value: 'updatePluginConfig',
				description: 'Replace config for a specific plugin',
				action: 'Update plugin configuration',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '=/api/config-editor/plugin/{{$parameter["pluginName"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Disable Plugin',
				value: 'disablePlugin',
				description: 'Mark a plugin as disabled',
				action: 'Disable plugin',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '=/api/config-editor/plugin/{{$parameter["pluginName"]}}/disable',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Enable Plugin',
				value: 'enablePlugin',
				description: 'Mark a plugin as enabled',
				action: 'Enable plugin',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '=/api/config-editor/plugin/{{$parameter["pluginName"]}}/enable',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'List Config Backups',
				value: 'listBackups',
				description: 'List available config.JSON backups',
				action: 'List config backups',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/config-editor/backups',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Config Backup',
				value: 'getBackup',
				description: 'Get config.JSON for a backup ID',
				action: 'Get config backup',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/config-editor/backups/{{$parameter["backupId"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Delete All Backups',
				value: 'deleteAllBackups',
				description: 'Delete all config.JSON backups',
				action: 'Delete all config backups',
				routing: {
					request: {
						method: 'DELETE' as IHttpRequestMethods,
						url: '/api/config-editor/backups',
					},
					...addAuthToRequest,
				},
			},
		],
		default: 'getConfig',
	},
];

export const configFields: INodeProperties[] = [
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['config'],
			},
		},
		description: 'Access token from Login operation. If not connected to Login node, enter manually.',
	},
	{
		displayName: 'Plugin Name',
		name: 'pluginName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['config'],
				operation: ['getPluginConfig', 'updatePluginConfig', 'disablePlugin', 'enablePlugin'],
			},
		},
		description: 'The name of the plugin',
	},
	{
		displayName: 'Backup ID',
		name: 'backupId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['config'],
				operation: ['getBackup'],
			},
		},
	},
	{
		displayName: 'Configuration',
		name: 'config',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				resource: ['config'],
				operation: ['updateConfig'],
			},
		},
		description: 'The Homebridge configuration JSON',
		routing: {
			send: {
				type: 'body',
				value: '={{JSON.parse($parameter["config"])}}',
			},
		},
	},
	{
		displayName: 'Plugin Configuration',
		name: 'pluginConfig',
		type: 'json',
		default: '[]',
		displayOptions: {
			show: {
				resource: ['config'],
				operation: ['updatePluginConfig'],
			},
		},
		description: 'Array of plugin config blocks',
		routing: {
			send: {
				type: 'body',
				value: '={{JSON.parse($parameter["pluginConfig"])}}',
			},
		},
	},
];

// =============================================================================
// PLUGIN OPERATIONS
// =============================================================================

export const pluginOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['plugins'],
			},
		},
		options: [
			{
				name: 'List Installed',
				value: 'listInstalled',
				description: 'Get list of installed Homebridge plugins',
				action: 'List installed plugins',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/plugins',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Search Plugins',
				value: 'search',
				description: 'Search NPM registry for Homebridge plugins',
				action: 'Search plugins',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/plugins/search/{{$parameter["query"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Lookup Plugin',
				value: 'lookup',
				description: 'Lookup a single plugin from NPM registry',
				action: 'Lookup plugin',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/plugins/lookup/{{$parameter["pluginName"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Plugin Versions',
				value: 'getVersions',
				description: 'Get available versions for a plugin',
				action: 'Get plugin versions',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/plugins/lookup/{{$parameter["pluginName"]}}/versions',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Config Schema',
				value: 'getConfigSchema',
				description: 'Get config.schema.JSON for a plugin',
				action: 'Get plugin config schema',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/plugins/config-schema/{{$parameter["pluginName"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Changelog',
				value: 'getChangelog',
				description: 'Get CHANGELOG.md for a plugin',
				action: 'Get plugin changelog',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/plugins/changelog/{{$parameter["pluginName"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Release Info',
				value: 'getRelease',
				description: 'Get latest GitHub release notes',
				action: 'Get plugin release info',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/plugins/release/{{$parameter["pluginName"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Plugin Alias',
				value: 'getAlias',
				description: 'Resolve plugin type and alias',
				action: 'Get plugin alias',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/plugins/alias/{{$parameter["pluginName"]}}',
					},
					...addAuthToRequest,
				},
			},
		],
		default: 'listInstalled',
	},
];

export const pluginFields: INodeProperties[] = [
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['plugins'],
			},
		},
		description: 'Access token from Login operation. If not connected to Login node, enter manually.',
	},
	{
		displayName: 'Search Query',
		name: 'query',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['plugins'],
				operation: ['search'],
			},
		},
		description: 'Search term for plugins',
	},
	{
		displayName: 'Plugin Name',
		name: 'pluginName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['plugins'],
				operation: ['lookup', 'getVersions', 'getConfigSchema', 'getChangelog', 'getRelease', 'getAlias'],
			},
		},
		description: 'The name of the plugin',
	},
];

// =============================================================================
// ACCESSORIES OPERATIONS
// =============================================================================

export const accessoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['accessories'],
			},
		},
		options: [
			{
				name: 'List Accessories',
				value: 'list',
				description: 'List all Homebridge accessories',
				action: 'List accessories',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/accessories',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Layout',
				value: 'getLayout',
				description: 'Get accessory and room layout',
				action: 'Get accessory layout',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/accessories/layout',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Accessory',
				value: 'getAccessory',
				description: 'Get single accessory and refresh characteristics',
				action: 'Get accessory',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/accessories/{{$parameter["uniqueId"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Set Characteristic',
				value: 'setCharacteristic',
				description: 'Set value of an accessory characteristic',
				action: 'Set accessory characteristic',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '=/api/accessories/{{$parameter["uniqueId"]}}',
					},
					...addAuthToRequest,
				},
			},
		],
		default: 'list',
	},
];

export const accessoryFields: INodeProperties[] = [
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['accessories'],
			},
		},
		description: 'Access token from Login operation. If not connected to Login node, enter manually.',
	},
	{
		displayName: 'Unique ID',
		name: 'uniqueId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['accessories'],
				operation: ['getAccessory', 'setCharacteristic'],
			},
		},
		description: 'The unique ID of the accessory',
	},
	{
		displayName: 'Characteristic Type',
		name: 'characteristicType',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['accessories'],
				operation: ['setCharacteristic'],
			},
		},
		description: 'The characteristic type to set',
		routing: {
			send: {
				type: 'body',
				property: 'characteristicType',
			},
		},
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['accessories'],
				operation: ['setCharacteristic'],
			},
		},
		description: 'The value to set (string, boolean, or integer)',
		routing: {
			send: {
				type: 'body',
				property: 'value',
			},
		},
	},
];

// =============================================================================
// USER MANAGEMENT OPERATIONS
// =============================================================================

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['users'],
			},
		},
		options: [
			{
				name: 'List Users',
				value: 'list',
				description: 'Get list of existing users',
				action: 'List users',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/users',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Create User',
				value: 'create',
				description: 'Create a new user',
				action: 'Create user',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/users',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Update User',
				value: 'update',
				description: 'Update an existing user',
				action: 'Update user',
				routing: {
					request: {
						method: 'PATCH' as IHttpRequestMethods,
						url: '=/api/users/{{$parameter["userId"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Delete User',
				value: 'delete',
				description: 'Delete a user',
				action: 'Delete user',
				routing: {
					request: {
						method: 'DELETE' as IHttpRequestMethods,
						url: '=/api/users/{{$parameter["userId"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Change Password',
				value: 'changePassword',
				description: 'Update password for current user',
				action: 'Change password',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/users/change-password',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Setup OTP',
				value: 'setupOTP',
				description: 'Start 2FA setup for current user',
				action: 'Setup OTP',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/users/otp/setup',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Activate OTP',
				value: 'activateOTP',
				description: 'Activate 2FA setup for current user',
				action: 'Activate OTP',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/users/otp/activate',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Deactivate OTP',
				value: 'deactivateOTP',
				description: 'Deactivate 2FA for current user',
				action: 'Deactivate OTP',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/users/otp/deactivate',
					},
					...addAuthToRequest,
				},
			},
		],
		default: 'list',
	},
];

export const userFields: INodeProperties[] = [
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['users'],
			},
		},
		description: 'Access token from Login operation. If not connected to Login node, enter manually.',
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['update', 'delete'],
			},
		},
		description: 'The ID of the user',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'name',
			},
		},
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'username',
			},
		},
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'password',
			},
		},
	},
	{
		displayName: 'Admin',
		name: 'admin',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['create', 'update'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'admin',
			},
		},
	},
	{
		displayName: 'Current Password',
		name: 'currentPassword',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['changePassword'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'currentPassword',
			},
		},
	},
	{
		displayName: 'New Password',
		name: 'newPassword',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['changePassword'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'newPassword',
			},
		},
	},
	{
		displayName: 'OTP Code',
		name: 'code',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['activateOTP'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'code',
			},
		},
	},
	{
		displayName: 'Password (for OTP Deactivation)',
		name: 'otpPassword',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['users'],
				operation: ['deactivateOTP'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'password',
			},
		},
	},
];

// =============================================================================
// STATUS OPERATIONS
// =============================================================================

export const statusOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['status'],
			},
		},
		options: [
			{
				name: 'Get CPU Info',
				value: 'getCPU',
				description: 'Get CPU load, history and temperature',
				action: 'Get CPU info',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/status/cpu',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get RAM Info',
				value: 'getRAM',
				description: 'Get memory usage and history',
				action: 'Get RAM info',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/status/ram',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Network Info',
				value: 'getNetwork',
				description: 'Get network transmission statistics',
				action: 'Get network info',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/status/network',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Uptime',
				value: 'getUptime',
				description: 'Get host and process uptime',
				action: 'Get uptime',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/status/uptime',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Check Homebridge Status',
				value: 'getHomebridgeStatus',
				description: 'Get current Homebridge status',
				action: 'Check homebridge status',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/status/homebridge',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Child Bridges',
				value: 'getChildBridges',
				description: 'Get active child bridges and status',
				action: 'Get child bridges',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/status/homebridge/child-bridges',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Homebridge Version',
				value: 'getHomebridgeVersion',
				description: 'Get Homebridge version information',
				action: 'Get homebridge version',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/status/homebridge-version',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Server Info',
				value: 'getServerInfo',
				description: 'Get host environment information',
				action: 'Get server info',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/status/server-information',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Node.js Info',
				value: 'getNodeInfo',
				description: 'Get Node.js version and update info',
				action: 'Get node js info',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/status/nodejs',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get RPi Throttled Status',
				value: 'getRPiThrottled',
				description: 'Get Raspberry Pi throttled status',
				action: 'Get r pi throttled status',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/status/rpi/throttled',
					},
					...addAuthToRequest,
				},
			},
		],
		default: 'getHomebridgeStatus',
	},
];

export const statusFields: INodeProperties[] = [
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['status'],
			},
		},
		description: 'Access token from Login operation. If not connected to Login node, enter manually.',
	},
];

// =============================================================================
// PLATFORM TOOLS OPERATIONS
// =============================================================================

export const platformOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['platform'],
			},
		},
		options: [
			{
				name: 'Restart Host (Linux)',
				value: 'restartHost',
				description: 'Restart the host server (Linux)',
				action: 'Restart host',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/platform-tools/linux/restart-host',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Shutdown Host (Linux)',
				value: 'shutdownHost',
				description: 'Shutdown the host server (Linux)',
				action: 'Shutdown host',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/platform-tools/linux/shutdown-host',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Docker Startup Script',
				value: 'getDockerStartup',
				description: 'Get Docker startup.sh file contents',
				action: 'Get docker startup script',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/platform-tools/docker/startup-script',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Update Docker Startup Script',
				value: 'updateDockerStartup',
				description: 'Update Docker startup.sh file',
				action: 'Update docker startup script',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/platform-tools/docker/startup-script',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Restart Docker Container',
				value: 'restartDockerContainer',
				action: 'Restart docker container',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/platform-tools/docker/restart-container',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get HB Service Settings',
				value: 'getHBServiceSettings',
				description: 'Get Homebridge startup settings',
				action: 'Get hb service settings',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/platform-tools/hb-service/homebridge-startup-settings',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Set HB Service Settings',
				value: 'setHBServiceSettings',
				description: 'Update Homebridge startup settings',
				action: 'Set hb service settings',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/platform-tools/hb-service/homebridge-startup-settings',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Download Log File',
				value: 'downloadLogFile',
				description: 'Download entire log file',
				action: 'Download log file',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/platform-tools/hb-service/log/download',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Truncate Log File',
				value: 'truncateLogFile',
				description: 'Empty the log file',
				action: 'Truncate log file',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/platform-tools/hb-service/log/truncate',
					},
					...addAuthToRequest,
				},
			},
		],
		default: 'getHBServiceSettings',
	},
];

export const platformFields: INodeProperties[] = [
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['platform'],
			},
		},
		description: 'Access token from Login operation. If not connected to Login node, enter manually.',
	},
	{
		displayName: 'Startup Settings',
		name: 'startupSettings',
		type: 'collection',
		placeholder: 'Add Startup Setting',
		default: {},
		displayOptions: {
			show: {
				resource: ['platform'],
				operation: ['setHBServiceSettings'],
			},
		},
		options: [
			{
				displayName: 'Debug Environment',
				name: 'ENV_DEBUG',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Debug Mode',
				name: 'HOMEBRIDGE_DEBUG',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Insecure Mode',
				name: 'HOMEBRIDGE_INSECURE',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Keep Orphans',
				name: 'HOMEBRIDGE_KEEP_ORPHANS',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Node Options',
				name: 'ENV_NODE_OPTIONS',
				type: 'string',
				default: '',
			},
		],
		routing: {
			send: {
				type: 'body',
				value: '={{$parameter["startupSettings"]}}',
			},
		},
	},
	{
		displayName: 'Include Colors',
		name: 'colour',
		type: 'options',
		options: [
			{
				name: 'Yes',
				value: 'yes',
			},
			{
				name: 'No',
				value: 'no',
			},
		],
		default: 'no',
		displayOptions: {
			show: {
				resource: ['platform'],
				operation: ['downloadLogFile'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'colour',
			},
		},
	},
];

// =============================================================================
// BACKUP & RESTORE OPERATIONS
// =============================================================================

export const backupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['backup'],
			},
		},
		options: [
			{
				name: 'Create Backup',
				value: 'createBackup',
				description: 'Create backup in backup directory',
				action: 'Create backup',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/backup',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Download Backup',
				value: 'downloadBackup',
				description: 'Download .tar.gz backup',
				action: 'Download backup',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/backup/download',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Next Backup Time',
				value: 'getNextBackupTime',
				description: 'Get next scheduled backup time',
				action: 'Get next backup time',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/backup/scheduled-backups/next',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'List Scheduled Backups',
				value: 'listScheduledBackups',
				description: 'List system generated backups',
				action: 'List scheduled backups',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/backup/scheduled-backups',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Get Scheduled Backup',
				value: 'getScheduledBackup',
				description: 'Download system backup by ID',
				action: 'Get scheduled backup',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '=/api/backup/scheduled-backups/{{$parameter["backupId"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Delete Scheduled Backup',
				value: 'deleteScheduledBackup',
				description: 'Delete system backup by ID',
				action: 'Delete scheduled backup',
				routing: {
					request: {
						method: 'DELETE' as IHttpRequestMethods,
						url: '=/api/backup/scheduled-backups/{{$parameter["backupId"]}}',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Restore Scheduled Backup',
				value: 'restoreScheduledBackup',
				description: 'Extract system backup to restore directory',
				action: 'Restore scheduled backup',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '=/api/backup/scheduled-backups/{{$parameter["backupId"]}}/restore',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Trigger Restore',
				value: 'triggerRestore',
				description: 'Trigger headless restore process',
				action: 'Trigger restore',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/backup/restore/trigger',
					},
					...addAuthToRequest,
				},
			},
			{
				name: 'Post Backup Restart',
				value: 'postBackupRestart',
				description: 'Hard restart after restoring backup',
				action: 'Post backup restart',
				routing: {
					request: {
						method: 'PUT' as IHttpRequestMethods,
						url: '/api/backup/restart',
					},
					...addAuthToRequest,
				},
			},
		],
		default: 'listScheduledBackups',
	},
];

export const backupFields: INodeProperties[] = [
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['backup'],
			},
		},
		description: 'Access token from Login operation. If not connected to Login node, enter manually.',
	},
	{
		displayName: 'Backup ID',
		name: 'backupId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['backup'],
				operation: ['getScheduledBackup', 'deleteScheduledBackup', 'restoreScheduledBackup'],
			},
		},
	},
];

// =============================================================================
// SETUP WIZARD OPERATIONS
// =============================================================================

export const setupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['setup'],
			},
		},
		options: [
			{
				name: 'Create First User',
				value: 'createFirstUser',
				description: 'Create the first user (setup wizard)',
				action: 'Create first user',
				routing: {
					request: {
						method: 'POST' as IHttpRequestMethods,
						url: '/api/setup-wizard/create-first-user',
					},
				},
			},
			{
				name: 'Get Setup Token',
				value: 'getSetupToken',
				description: 'Get auth token for setup wizard',
				action: 'Get setup token',
				routing: {
					request: {
						method: 'GET' as IHttpRequestMethods,
						url: '/api/setup-wizard/get-setup-wizard-token',
					},
				},
			},
		],
		default: 'getSetupToken',
	},
];

export const setupFields: INodeProperties[] = [
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['setup'],
			},
		},
		description: 'Access token from Login operation. If not connected to Login node, enter manually.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['setup'],
				operation: ['createFirstUser'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'name',
			},
		},
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['setup'],
				operation: ['createFirstUser'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'username',
			},
		},
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: { password: true },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['setup'],
				operation: ['createFirstUser'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'password',
			},
		},
	},
	{
		displayName: 'Admin',
		name: 'admin',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: ['setup'],
				operation: ['createFirstUser'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'admin',
			},
		},
	},
];
