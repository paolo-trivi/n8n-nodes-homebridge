/**
 * Generic Functions for Homebridge Node
 * Centralized helper functions following n8n best practices
 */

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
	JsonObject,
} from 'n8n-workflow';

import {
	IHomebridgeCredentials,
} from './types';

// NOTE: This file is in the reference/ directory and is NOT compiled.
// It serves as a reference implementation for future development.

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RETRY_STATUS_CODES = [429, 500, 502, 503, 504];

// =============================================================================
// AUTHENTICATION HELPERS
// =============================================================================

/**
 * Get Homebridge credentials from the execution context
 * @param this - n8n execution context
 * @returns Homebridge credentials
 */
export async function getCredentials(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
): Promise<IHomebridgeCredentials> {
	const credentials = await this.getCredentials('homebridgeApi');

	if (!credentials) {
		throw new NodeOperationError(
			this.getNode(),
			'No Homebridge credentials found. Please configure credentials first.',
		);
	}

	// Validate required fields
	if (!credentials.serverUrl) {
		throw new NodeOperationError(
			this.getNode(),
			'Server URL is required in Homebridge credentials.',
		);
	}

	if (!credentials.username) {
		throw new NodeOperationError(
			this.getNode(),
			'Username is required in Homebridge credentials.',
		);
	}

	if (!credentials.password) {
		throw new NodeOperationError(
			this.getNode(),
			'Password is required in Homebridge credentials.',
		);
	}

	// Ensure serverUrl doesn't end with a slash
	let serverUrl = credentials.serverUrl as string;
	if (serverUrl.endsWith('/')) {
		serverUrl = serverUrl.slice(0, -1);
	}

	return {
		serverUrl,
		username: credentials.username as string,
		password: credentials.password as string,
		otp: credentials.otp as string | undefined,
	};
}

/**
 * Authenticate with Homebridge API and get access token
 * @param this - n8n execution context
 * @param credentials - Homebridge credentials
 * @param otp - Optional 2FA code
 * @returns Access token
 */
export async function authenticate(
	this: IExecuteFunctions | IHookFunctions | ILoadOptionsFunctions,
	credentials: IHomebridgeCredentials,
	otp?: string,
): Promise<string> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: `${credentials.serverUrl}/api/auth/login`,
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		body: {
			username: credentials.username,
			password: credentials.password,
			...(otp && { otp }),
		},
		returnFullResponse: false,
		ignoreHttpStatusErrors: false,
	};

	try {
		const response = await this.helpers.httpRequest(options);

		if (!response.access_token) {
			throw new NodeApiError(this.getNode(), {
				message: 'Login successful but no access token received',
				description: 'The Homebridge API did not return an access token.',
			});
		}

		return response.access_token as string;
	} catch (error) {
		if (error.statusCode === 401) {
			throw new NodeApiError(this.getNode(), {
				message: 'Authentication failed',
				description: 'Invalid username, password, or 2FA code. Please check your credentials.',
			});
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Get access token from input data or authenticate
 * @param this - n8n execution context
 * @param itemIndex - Index of the current item
 * @returns Access token
 */
export async function getAccessToken(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<string> {
	// Try to get token from node parameter
	let accessToken = this.getNodeParameter('accessToken', itemIndex, '') as string;

	if (accessToken) {
		return accessToken;
	}

	// Try to get token from input data
	const items = this.getInputData();
	if (items && items.length > 0) {
		const item = items[itemIndex];

		// Check if access_token is directly in the item
		if (item.json.access_token) {
			return item.json.access_token as string;
		}

		// Check if access_token is in an array
		if (Array.isArray(item.json) && item.json.length > 0) {
			const firstItem = item.json[0] as IDataObject;
			if (firstItem && firstItem.access_token) {
				return firstItem.access_token as string;
			}
		}
	}

	// No token found, throw error
	throw new NodeOperationError(
		this.getNode(),
		'No access token available. Please either:\n' +
		'1. Connect a Login node to this node, or\n' +
		'2. Manually enter the access token in the "Access Token" field.',
		{ itemIndex },
	);
}

// =============================================================================
// HTTP REQUEST HELPERS
// =============================================================================

/**
 * Make an authenticated API request to Homebridge
 * @param this - n8n execution context
 * @param method - HTTP method
 * @param endpoint - API endpoint (without /api prefix)
 * @param body - Request body
 * @param qs - Query string parameters
 * @param itemIndex - Index of the current item
 * @returns API response
 */
export async function homebridgeApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
	itemIndex: number = 0,
): Promise<IDataObject | IDataObject[]> {
	const credentials = await getCredentials.call(this);
	const accessToken = await getAccessToken.call(this, itemIndex);

	// Ensure endpoint starts with /
	if (!endpoint.startsWith('/')) {
		endpoint = '/' + endpoint;
	}

	const options: IHttpRequestOptions = {
		method,
		url: `${credentials.serverUrl}${endpoint}`,
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${accessToken}`,
		},
		...(body && { body }),
		...(qs && { qs }),
		returnFullResponse: false,
		ignoreHttpStatusErrors: true,
	};

	try {
		const response = await homebridgeApiRequestWithRetry.call(this, options);
		return response;
	} catch (error) {
		throw handleApiError.call(this, error, endpoint, method);
	}
}

/**
 * Make an API request with retry logic
 * @param this - n8n execution context
 * @param options - HTTP request options
 * @param retryCount - Current retry count
 * @returns API response
 */
async function homebridgeApiRequestWithRetry(
	this: IExecuteFunctions,
	options: IHttpRequestOptions,
	retryCount: number = 0,
): Promise<IDataObject | IDataObject[]> {
	try {
		const response = await this.helpers.httpRequest(options);
		return response as IDataObject | IDataObject[];
	} catch (error: any) {
		const statusCode = error.statusCode || error.response?.statusCode;

		// Retry on specific status codes
		if (
			RETRY_STATUS_CODES.includes(statusCode) &&
			retryCount < MAX_RETRIES
		) {
			const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
			await new Promise(resolve => setTimeout(resolve, delay));
			return homebridgeApiRequestWithRetry.call(this, options, retryCount + 1);
		}

		throw error;
	}
}

/**
 * Handle API errors and provide user-friendly messages
 * @param this - n8n execution context
 * @param error - Error object
 * @param endpoint - API endpoint
 * @param method - HTTP method
 * @returns NodeApiError
 */
function handleApiError(
	this: IExecuteFunctions,
	error: any,
	endpoint: string,
	method: string,
): NodeApiError {
	const statusCode = error.statusCode || error.response?.statusCode || 500;
	const errorMessage = error.message || 'Unknown error';
	const errorBody = error.response?.body || error.error || {};

	let message = `Homebridge API Error (${method} ${endpoint})`;
	let description = errorMessage;

	switch (statusCode) {
		case 400:
			message = 'Bad Request';
			description = 'The request was invalid. Please check your parameters.';
			break;
		case 401:
			message = 'Unauthorized';
			description = 'Access token is invalid or expired. Please authenticate again.';
			break;
		case 403:
			message = 'Forbidden';
			description = 'You do not have permission to perform this action.';
			break;
		case 404:
			message = 'Not Found';
			description = 'The requested resource was not found.';
			break;
		case 422:
			message = 'Validation Error';
			description = 'The request data is invalid. ' + (errorBody.message || '');
			break;
		case 429:
			message = 'Rate Limit Exceeded';
			description = 'Too many requests. Please wait before trying again.';
			break;
		case 500:
		case 502:
		case 503:
		case 504:
			message = 'Server Error';
			description = 'The Homebridge server encountered an error. Please try again later.';
			break;
	}

	return new NodeApiError(this.getNode(), {
		message,
		description,
		httpCode: statusCode.toString(),
		...(errorBody && { cause: errorBody }),
	});
}

// =============================================================================
// DATA TRANSFORMATION HELPERS
// =============================================================================

/**
 * Simplify the output by extracting relevant data
 * @param data - Raw API response
 * @returns Simplified data
 */
export function simplifyOutput(data: IDataObject | IDataObject[]): IDataObject | IDataObject[] {
	if (Array.isArray(data)) {
		return data.map(item => simplifyOutputItem(item));
	}
	return simplifyOutputItem(data);
}

/**
 * Simplify a single output item
 * @param item - Raw item
 * @returns Simplified item
 */
function simplifyOutputItem(item: IDataObject): IDataObject {
	// Remove unnecessary fields
	const fieldsToRemove = ['__v', '_id', 'updatedAt', 'createdAt'];
	const simplified = { ...item };

	fieldsToRemove.forEach(field => {
		delete simplified[field];
	});

	return simplified;
}

/**
 * Parse JSON string safely
 * @param this - n8n execution context
 * @param jsonString - JSON string to parse
 * @param parameterName - Parameter name for error message
 * @returns Parsed JSON object
 */
export function parseJsonSafely(
	this: IExecuteFunctions,
	jsonString: string,
	parameterName: string,
	itemIndex: number = 0,
): IDataObject {
	try {
		return JSON.parse(jsonString);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid JSON in parameter "${parameterName}". Please ensure it's valid JSON.`,
			{ itemIndex },
		);
	}
}

/**
 * Validate required parameters
 * @param this - n8n execution context
 * @param parameters - Parameters to validate
 * @param itemIndex - Index of the current item
 */
export function validateRequiredParameters(
	this: IExecuteFunctions,
	parameters: { [key: string]: any },
	itemIndex: number = 0,
): void {
	for (const [key, value] of Object.entries(parameters)) {
		if (value === undefined || value === null || value === '') {
			throw new NodeOperationError(
				this.getNode(),
				`Required parameter "${key}" is missing or empty.`,
				{ itemIndex },
			);
		}
	}
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns True if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validate port number
 * @param port - Port number to validate
 * @returns True if valid, false otherwise
 */
export function isValidPort(port: number): boolean {
	return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Validate UUID format
 * @param uuid - UUID to validate
 * @returns True if valid, false otherwise
 */
export function isValidUuid(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

// =============================================================================
// MCP (Model Context Protocol) HELPERS
// =============================================================================

/**
 * Generate MCP tool definition for an operation
 * @param resource - Resource name
 * @param operation - Operation name
 * @param description - Operation description
 * @param parameters - Parameter schema
 * @returns MCP tool definition
 */
export function generateMcpToolDefinition(
	resource: string,
	operation: string,
	description: string,
	parameters: IDataObject,
): IDataObject {
	return {
		name: `homebridge_${resource}_${operation}`,
		description: `Homebridge: ${description}`,
		inputSchema: {
			type: 'object',
			properties: parameters,
			required: Object.keys(parameters).filter(
				key => (parameters[key] as IDataObject).required === true,
			),
		},
	};
}

/**
 * Execute batch operations
 * @param this - n8n execution context
 * @param operations - Array of operations to execute
 * @returns Array of results
 */
export async function executeBatchOperations(
	this: IExecuteFunctions,
	operations: Array<{
		method: IHttpRequestMethods;
		endpoint: string;
		body?: IDataObject;
		qs?: IDataObject;
	}>,
): Promise<IDataObject[]> {
	const results: IDataObject[] = [];

	for (let i = 0; i < operations.length; i++) {
		const operation = operations[i];
		try {
			const result = await homebridgeApiRequest.call(
				this,
				operation.method,
				operation.endpoint,
				operation.body,
				operation.qs,
				i,
			);
			results.push({
				success: true,
				data: result,
			});
		} catch (error) {
			results.push({
				success: false,
				error: error.message,
			});
		}
	}

	return results;
}

// =============================================================================
// PAGINATION HELPERS
// =============================================================================

/**
 * Handle paginated requests
 * @param this - n8n execution context
 * @param method - HTTP method
 * @param endpoint - API endpoint
 * @param qs - Query string parameters
 * @param itemIndex - Index of the current item
 * @param limit - Maximum number of items to return
 * @returns All items from paginated response
 */
export async function handlePaginatedRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	qs: IDataObject = {},
	itemIndex: number = 0,
	limit: number = 0,
): Promise<IDataObject[]> {
	let allItems: IDataObject[] = [];
	let page = 1;
	const pageSize = 100;

	do {
		const response = await homebridgeApiRequest.call(
			this,
			method,
			endpoint,
			undefined,
			{ ...qs, page, limit: pageSize },
			itemIndex,
		);

		const items = Array.isArray(response) ? response : [response];
		allItems = allItems.concat(items);

		if (limit > 0 && allItems.length >= limit) {
			allItems = allItems.slice(0, limit);
			break;
		}

		if (items.length < pageSize) {
			break;
		}

		page++;
	} while (true);

	return allItems;
}

// =============================================================================
// UTILITY HELPERS
// =============================================================================

/**
 * Sleep for a specified duration
 * @param ms - Duration in milliseconds
 */
export async function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format date to ISO string
 * @param date - Date to format
 * @returns ISO string
 */
export function formatDate(date: Date): string {
	return date.toISOString();
}

/**
 * Convert bytes to human-readable format
 * @param bytes - Number of bytes
 * @returns Human-readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Convert seconds to human-readable duration
 * @param seconds - Number of seconds
 * @returns Human-readable string
 */
export function formatDuration(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

	return parts.join(' ');
}

/**
 * Deep merge two objects
 * @param target - Target object
 * @param source - Source object
 * @returns Merged object
 */
export function deepMerge(target: IDataObject, source: IDataObject): IDataObject {
	const result = { ...target };

	for (const key in source) {
		if (source[key] instanceof Object && key in target) {
			result[key] = deepMerge(
				target[key] as IDataObject,
				source[key] as IDataObject,
			);
		} else {
			result[key] = source[key];
		}
	}

	return result;
}
