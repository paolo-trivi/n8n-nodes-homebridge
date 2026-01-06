/**
 * Homebridge Node - Improved Version (REFERENCE IMPLEMENTATION)
 *
 * NOTE: This file is in the reference/ directory and is NOT compiled or used.
 * It serves as a reference implementation showing how to use GenericFunctions,
 * types, and constants for future development.
 *
 * Complete integration with Homebridge API following n8n best practices
 * Optimized for MCP (Model Context Protocol)
 */

import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import * as GenericFunctions from './GenericFunctions';
import { RESOURCES } from './constants';

export class HomebridgeImproved implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Homebridge',
		name: 'homebridge',
		icon: { light: 'file:homebridge-logo.svg', dark: 'file:homebridge-logo.svg' },
		group: ['transform'],
		version: 2,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Homebridge API - Complete integration with MCP support',
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
				testedBy: 'testHomebridgeApiCredentials',
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.serverUrl}}',
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
						value: RESOURCES.ACCESSORIES,
						description: 'Control HomeKit accessories',
					},
					{
						name: 'Authentication',
						value: RESOURCES.AUTH,
						description: 'Manage authentication and login',
					},
					{
						name: 'Backup & Restore',
						value: RESOURCES.BACKUP,
						description: 'Backup and restore operations',
					},
					{
						name: 'Config Editor',
						value: RESOURCES.CONFIG,
						description: 'Manage Homebridge configuration',
					},
					{
						name: 'Platform Tool',
						value: RESOURCES.PLATFORM,
						description: 'Platform-specific operations',
					},
					{
						name: 'Plugin',
						value: RESOURCES.PLUGINS,
						description: 'Manage Homebridge plugins',
					},
					{
						name: 'Server',
						value: RESOURCES.SERVER,
						description: 'Control Homebridge server and bridges',
					},
					{
						name: 'Setup Wizard',
						value: RESOURCES.SETUP,
						description: 'Initial setup operations',
					},
					{
						name: 'Status',
						value: RESOURCES.STATUS,
						description: 'Get system status information',
					},
					{
						name: 'User',
						value: RESOURCES.USERS,
						description: 'Manage user accounts',
					},
				],
				default: RESOURCES.AUTH,
			},

			// Import operations from HomebridgeDescription.ts
			// This keeps the existing comprehensive operation definitions
			// while using the improved execution logic
		],
	};

	methods = {
		credentialTest: {
			async testHomebridgeApiCredentials(
				this: IExecuteFunctions,
				credential: any,
			): Promise<any> {
				try {
					const credentials = credential.data as any;

					if (!credentials.serverUrl) {
						return {
							status: 'Error',
							message: 'Server URL is required',
						};
					}

					if (!credentials.username || !credentials.password) {
						return {
							status: 'Error',
							message: 'Username and password are required',
						};
					}

					// Test connection by getting auth settings
					const options = {
						method: 'GET' as const,
						url: `${credentials.serverUrl}/api/auth/settings`,
						headers: {
							'Accept': 'application/json',
						},
					};

					await this.helpers.httpRequest(options);

					return {
						status: 'OK',
						message: 'Connection successful',
					};
				} catch (error: any) {
					return {
						status: 'Error',
						message: error.message || 'Connection failed',
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;

		// Process each item
		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				let responseData: any;

				// =============================================================================
				// AUTHENTICATION RESOURCE
				// =============================================================================
				if (resource === RESOURCES.AUTH) {
					if (operation === 'login') {
						const credentials = await GenericFunctions.getCredentials.call(this);
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

						const otp = additionalFields.otp || credentials.otp;
						const accessToken = await GenericFunctions.authenticate.call(
							this,
							credentials,
							otp,
						);

						responseData = {
							access_token: accessToken,
							token_type: 'Bearer',
							success: true,
						};
					} else if (operation === 'getSettings') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/auth/settings',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'noAuth') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'POST',
							'/api/auth/noauth',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'checkAuth') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/auth/check',
							undefined,
							undefined,
							i,
						);
					}
				}

				// =============================================================================
				// SERVER RESOURCE
				// =============================================================================
				else if (resource === RESOURCES.SERVER) {
					if (operation === 'restart') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'PUT',
							'/api/server/restart',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'restartChild') {
						const deviceId = this.getNodeParameter('deviceId', i) as string;
						GenericFunctions.validateRequiredParameters.call(this, { deviceId }, i);

						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'PUT',
							`/api/server/restart/${deviceId}`,
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'stopChild') {
						const deviceId = this.getNodeParameter('deviceId', i) as string;
						GenericFunctions.validateRequiredParameters.call(this, { deviceId }, i);

						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'PUT',
							`/api/server/stop/${deviceId}`,
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'startChild') {
						const deviceId = this.getNodeParameter('deviceId', i) as string;
						GenericFunctions.validateRequiredParameters.call(this, { deviceId }, i);

						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'PUT',
							`/api/server/start/${deviceId}`,
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'getPairing') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/server/pairing',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'getCachedAccessories') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/server/cached-accessories',
							undefined,
							undefined,
							i,
						);
					}
					// Add all other server operations...
				}

				// =============================================================================
				// ACCESSORIES RESOURCE
				// =============================================================================
				else if (resource === RESOURCES.ACCESSORIES) {
					if (operation === 'list') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/accessories',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'getLayout') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/accessories/layout',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'getAccessory') {
						const uniqueId = this.getNodeParameter('uniqueId', i) as string;
						GenericFunctions.validateRequiredParameters.call(this, { uniqueId }, i);

						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							`/api/accessories/${uniqueId}`,
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'setCharacteristic') {
						const uniqueId = this.getNodeParameter('uniqueId', i) as string;
						const characteristicType = this.getNodeParameter('characteristicType', i) as string;
						const value = this.getNodeParameter('value', i) as string;

						GenericFunctions.validateRequiredParameters.call(
							this,
							{ uniqueId, characteristicType, value },
							i,
						);

						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'PUT',
							`/api/accessories/${uniqueId}`,
							{ characteristicType, value },
							undefined,
							i,
						);
					}
				}

				// =============================================================================
				// PLUGINS RESOURCE
				// =============================================================================
				else if (resource === RESOURCES.PLUGINS) {
					if (operation === 'listInstalled') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/plugins',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'search') {
						const query = this.getNodeParameter('query', i) as string;
						GenericFunctions.validateRequiredParameters.call(this, { query }, i);

						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							`/api/plugins/search/${encodeURIComponent(query)}`,
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'lookup') {
						const pluginName = this.getNodeParameter('pluginName', i) as string;
						GenericFunctions.validateRequiredParameters.call(this, { pluginName }, i);

						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							`/api/plugins/lookup/${encodeURIComponent(pluginName)}`,
							undefined,
							undefined,
							i,
						);
					}
					// Add all other plugin operations...
				}

				// =============================================================================
				// CONFIG RESOURCE
				// =============================================================================
				else if (resource === RESOURCES.CONFIG) {
					if (operation === 'getConfig') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/config-editor',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'updateConfig') {
						const configString = this.getNodeParameter('config', i) as string;
						const config = GenericFunctions.parseJsonSafely.call(
							this,
							configString,
							'config',
							i,
						);

						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'POST',
							'/api/config-editor',
							config,
							undefined,
							i,
						);
					}
					// Add all other config operations...
				}

				// =============================================================================
				// STATUS RESOURCE
				// =============================================================================
				else if (resource === RESOURCES.STATUS) {
					if (operation === 'getHomebridgeStatus') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/status/homebridge',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'getCPU') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/status/cpu',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'getRAM') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/status/ram',
							undefined,
							undefined,
							i,
						);
					}
					// Add all other status operations...
				}

				// =============================================================================
				// USERS RESOURCE
				// =============================================================================
				else if (resource === RESOURCES.USERS) {
					if (operation === 'list') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/users',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'create') {
						const name = this.getNodeParameter('name', i) as string;
						const username = this.getNodeParameter('username', i) as string;
						const password = this.getNodeParameter('password', i) as string;
						const admin = this.getNodeParameter('admin', i, false) as boolean;

						GenericFunctions.validateRequiredParameters.call(
							this,
							{ name, username, password },
							i,
						);

						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'POST',
							'/api/users',
							{ name, username, password, admin },
							undefined,
							i,
						);
					}
					// Add all other user operations...
				}

				// =============================================================================
				// BACKUP RESOURCE
				// =============================================================================
				else if (resource === RESOURCES.BACKUP) {
					if (operation === 'createBackup') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'POST',
							'/api/backup',
							undefined,
							undefined,
							i,
						);
					} else if (operation === 'listScheduledBackups') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/backup/scheduled-backups',
							undefined,
							undefined,
							i,
						);
					}
					// Add all other backup operations...
				}

				// =============================================================================
				// PLATFORM RESOURCE
				// =============================================================================
				else if (resource === RESOURCES.PLATFORM) {
					if (operation === 'getHBServiceSettings') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/platform-tools/hb-service/homebridge-startup-settings',
							undefined,
							undefined,
							i,
						);
					}
					// Add all other platform operations...
				}

				// =============================================================================
				// SETUP RESOURCE
				// =============================================================================
				else if (resource === RESOURCES.SETUP) {
					if (operation === 'getSetupToken') {
						responseData = await GenericFunctions.homebridgeApiRequest.call(
							this,
							'GET',
							'/api/setup-wizard/get-setup-wizard-token',
							undefined,
							undefined,
							i,
						);
					}
					// Add all other setup operations...
				}

				// Simplify output if needed
				const simplifiedData = GenericFunctions.simplifyOutput(responseData);

				// Add execution metadata
				const executionData = {
					json: {
						...simplifiedData,
						_metadata: {
							resource,
							operation,
							executedAt: new Date().toISOString(),
							success: true,
						},
					},
					pairedItem: { item: i },
				};

				returnData.push(executionData);
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
							_metadata: {
								resource: this.getNodeParameter('resource', i) as string,
								operation: this.getNodeParameter('operation', i) as string,
								executedAt: new Date().toISOString(),
								success: false,
							},
						},
						pairedItem: { item: i },
					});
					continue;
				}

				throw error;
			}
		}

		return [returnData];
	}
}
