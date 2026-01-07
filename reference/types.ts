/**
 * Type definitions for Homebridge API
 * Following n8n best practices and TypeScript strict mode
 */

import { IDataObject } from 'n8n-workflow';

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

export interface IHomebridgeCredentials {
	serverUrl: string;
	username: string;
	password: string;
	otp?: string;
}

export interface IAuthLoginRequest {
	username: string;
	password: string;
	otp?: string;
}

export interface IAuthLoginResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
}

export interface IAuthSettings {
	formAuth: boolean;
	theme: string;
	env: {
		platform: string;
		enableTerminalAccess: boolean;
		enableAccessories: boolean;
		homebridgeInstanceName: string;
	};
}

// =============================================================================
// SERVER TYPES
// =============================================================================

export interface ICachedAccessory {
	UUID: string;
	displayName: string;
	context: IDataObject;
	plugin: string;
	cacheFile: string;
}

export interface IDevicePairing {
	deviceId: string;
	username: string;
	publicKey: string;
	permission: number;
}

export interface INetworkInterface {
	name: string;
	address: string;
	family: string;
	mac: string;
	internal: boolean;
}

// =============================================================================
// ACCESSORY TYPES
// =============================================================================

export interface IAccessory {
	aid: number;
	iid: number;
	uuid: string;
	type: string;
	humanType: string;
	serviceName: string;
	serviceCharacteristics: ICharacteristic[];
	accessoryInformation: IDataObject;
	values: IDataObject;
	instance: IDataObject;
	uniqueId: string;
}

export interface ICharacteristic {
	aid: number;
	iid: number;
	uuid: string;
	type: string;
	serviceType: string;
	serviceName: string;
	description: string;
	value: string | number | boolean;
	format: string;
	perms: string[];
	unit?: string;
	maxValue?: number;
	minValue?: number;
	minStep?: number;
	canRead: boolean;
	canWrite: boolean;
}

export interface IAccessoryLayout {
	rooms: IRoom[];
	accessories: IAccessory[];
}

export interface IRoom {
	name: string;
	accessories: string[]; // Array of uniqueIds
}

export interface ISetCharacteristicRequest {
	characteristicType: string;
	value: string | number | boolean;
}

// =============================================================================
// PLUGIN TYPES
// =============================================================================

export interface IPlugin {
	name: string;
	displayName: string;
	description: string;
	version: string;
	latestVersion?: string;
	updateAvailable: boolean;
	installedVersion: string;
	publicPackage: boolean;
	links: {
		npm?: string;
		homepage?: string;
		bugs?: string;
	};
	author?: string;
	certifiedPlugin?: boolean;
	verifiedPlugin?: boolean;
	settingsSchema?: boolean;
	installPath: string;
	globalInstall: boolean;
	settingsSchemaVersion?: number;
}

export interface IPluginSearchResult {
	name: string;
	description: string;
	version: string;
	author?: string;
	verified?: boolean;
	certified?: boolean;
	links: IDataObject;
	lastUpdated: string;
	downloads: number;
}

export interface IPluginConfigSchema {
	pluginAlias: string;
	pluginType: 'platform' | 'accessory';
	singular: boolean;
	schema: IDataObject;
	form?: IDataObject[];
	display?: IDataObject;
	layout?: IDataObject[];
}

// =============================================================================
// USER TYPES
// =============================================================================

export interface IUser {
	id: number;
	name: string;
	username: string;
	admin: boolean;
	otpActive?: boolean;
}

export interface ICreateUserRequest {
	name: string;
	username: string;
	password: string;
	admin: boolean;
}

export interface IUpdateUserRequest {
	name?: string;
	username?: string;
	admin?: boolean;
}

export interface IChangePasswordRequest {
	currentPassword: string;
	newPassword: string;
}

export interface IOtpSetupResponse {
	qrcode: string;
	secret: string;
}

export interface IOtpActivateRequest {
	code: string;
}

export interface IOtpDeactivateRequest {
	password: string;
}

// =============================================================================
// STATUS TYPES
// =============================================================================

export interface ICpuInfo {
	currentLoad: number;
	currentLoadUser: number;
	currentLoadSystem: number;
	currentLoadIdle: number;
	cpuTemperature: number;
	cpuLoadHistory: number[];
}

export interface IRamInfo {
	total: number;
	used: number;
	free: number;
	usedPercent: number;
	memoryHistory: number[];
}

export interface INetworkInfo {
	rx_sec: number;
	tx_sec: number;
	rx_bytes: number;
	tx_bytes: number;
}

export interface IUptimeInfo {
	processUptime: number;
	systemUptime: number;
}

export interface IHomebridgeStatus {
	status: 'up' | 'down' | 'pending';
	consolePort: number;
	port: number;
	pin: string;
	username: string;
	setupUri?: string;
}

export interface IChildBridge {
	username: string;
	displayName: string;
	status: 'ok' | 'pending' | 'down';
	plugin: string;
	paired: boolean;
	setupUri?: string;
	mDNS?: IDataObject;
}

export interface IHomebridgeVersion {
	package: string;
	installedVersion: string;
	latestVersion: string;
	updateAvailable: boolean;
}

export interface IServerInfo {
	platform: string;
	arch: string;
	nodeVersion: string;
	homebridgeVersion: string;
	serviceName: string;
	runningInDocker: boolean;
	runningInLinux: boolean;
	runningInSynologyPackage: boolean;
	enableAccessories: boolean;
	enableTerminalAccess: boolean;
}

export interface INodeJsInfo {
	currentVersion: string;
	latestVersion: string;
	updateAvailable: boolean;
	showUpdateWarning: boolean;
}

// =============================================================================
// BACKUP TYPES
// =============================================================================

export interface IBackupInfo {
	id: string;
	timestamp: string;
	size: number;
	file: string;
}

export interface IScheduledBackupInfo extends IBackupInfo {
	instanceId: string;
	scheduled: boolean;
}

// =============================================================================
// CONFIG TYPES
// =============================================================================

export interface IHomebridgeConfig {
	bridge: {
		name: string;
		username: string;
		port: number;
		pin: string;
		advertiser?: string;
		bind?: string[];
	};
	accessories?: IDataObject[];
	platforms?: IDataObject[];
	plugins?: string[];
	disabledPlugins?: string[];
}

export interface IConfigBackup {
	id: number;
	timestamp: string;
	file: string;
}

// =============================================================================
// PLATFORM TOOLS TYPES
// =============================================================================

export interface IHomebridgeStartupSettings {
	ENV_DEBUG?: string;
	HOMEBRIDGE_DEBUG?: boolean;
	HOMEBRIDGE_INSECURE?: boolean;
	HOMEBRIDGE_KEEP_ORPHANS?: boolean;
	ENV_NODE_OPTIONS?: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface IHomebridgeError {
	statusCode: number;
	message: string;
	error?: string;
}

export class HomebridgeApiError extends Error {
	statusCode: number;
	response?: IDataObject;

	constructor(message: string, statusCode: number, response?: IDataObject) {
		super(message);
		this.name = 'HomebridgeApiError';
		this.statusCode = statusCode;
		this.response = response;
	}
}

// =============================================================================
// REQUEST OPTIONS TYPES
// =============================================================================

export interface IHomebridgeRequestOptions {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	url: string;
	headers?: IDataObject;
	body?: IDataObject;
	qs?: IDataObject;
	timeout?: number;
	retry?: {
		maxRetries: number;
		retryDelay: number;
		retryOn?: number[];
	};
}

// =============================================================================
// MCP (Model Context Protocol) TYPES
// =============================================================================

export interface IMcpToolDefinition {
	name: string;
	description: string;
	inputSchema: {
		type: 'object';
		properties: IDataObject;
		required?: string[];
	};
}

export interface IMcpBatchOperation {
	operations: Array<{
		resource: string;
		operation: string;
		parameters: IDataObject;
	}>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type HomebridgeResource =
	| 'accessories'
	| 'auth'
	| 'backup'
	| 'config'
	| 'platform'
	| 'plugins'
	| 'server'
	| 'setup'
	| 'status'
	| 'users';

export type HomebridgeOperation = string; // Too many to enumerate

export interface IHomebridgeContext {
	credentials: IHomebridgeCredentials;
	resource: HomebridgeResource;
	operation: HomebridgeOperation;
	parameters: IDataObject;
	accessToken?: string;
}

// =============================================================================
// VALIDATION SCHEMAS (for future zod/joi integration)
// =============================================================================

export interface IValidationSchema {
	[key: string]: {
		type: 'string' | 'number' | 'boolean' | 'array' | 'object';
		required?: boolean;
		min?: number;
		max?: number;
		pattern?: string;
		enum?: unknown[];
	};
}
