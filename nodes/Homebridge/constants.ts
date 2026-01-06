/**
 * Constants for Homebridge Node
 * Centralized configuration values
 */

// =============================================================================
// API CONFIGURATION
// =============================================================================

export const API_BASE_PATH = '/api';
export const API_TIMEOUT = 30000; // 30 seconds
export const API_MAX_RETRIES = 3;
export const API_RETRY_DELAY = 1000; // 1 second
export const API_RETRY_STATUS_CODES = [429, 500, 502, 503, 504];

// =============================================================================
// HOMEBRIDGE RESOURCES
// =============================================================================

export const RESOURCES = {
	ACCESSORIES: 'accessories',
	AUTH: 'auth',
	BACKUP: 'backup',
	CONFIG: 'config',
	PLATFORM: 'platform',
	PLUGINS: 'plugins',
	SERVER: 'server',
	SETUP: 'setup',
	STATUS: 'status',
	USERS: 'users',
} as const;

// =============================================================================
// HTTP METHODS
// =============================================================================

export const HTTP_METHODS = {
	GET: 'GET',
	POST: 'POST',
	PUT: 'PUT',
	PATCH: 'PATCH',
	DELETE: 'DELETE',
} as const;

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const ERROR_MESSAGES = {
	NO_CREDENTIALS: 'No Homebridge credentials found. Please configure credentials first.',
	NO_SERVER_URL: 'Server URL is required in Homebridge credentials.',
	NO_USERNAME: 'Username is required in Homebridge credentials.',
	NO_PASSWORD: 'Password is required in Homebridge credentials.',
	NO_ACCESS_TOKEN: 'No access token available. Please either connect a Login node or manually enter the access token.',
	INVALID_JSON: 'Invalid JSON in parameter. Please ensure it\'s valid JSON.',
	AUTHENTICATION_FAILED: 'Authentication failed. Please check your credentials.',
	NETWORK_ERROR: 'Network error. Please check your connection and try again.',
} as const;

// =============================================================================
// SUCCESS MESSAGES
// =============================================================================

export const SUCCESS_MESSAGES = {
	OPERATION_COMPLETED: 'Operation completed successfully',
	AUTHENTICATED: 'Successfully authenticated with Homebridge',
	SERVER_RESTARTED: 'Homebridge server restarted successfully',
	CONFIG_UPDATED: 'Configuration updated successfully',
	BACKUP_CREATED: 'Backup created successfully',
} as const;

// =============================================================================
// VALIDATION PATTERNS
// =============================================================================

export const VALIDATION_PATTERNS = {
	EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
	URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
	PORT: /^([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/,
} as const;

// =============================================================================
// MCP (Model Context Protocol) CONFIGURATION
// =============================================================================

export const MCP_CONFIG = {
	TOOL_PREFIX: 'homebridge',
	MAX_BATCH_SIZE: 10,
	ENABLE_STREAMING: true,
	ENABLE_WEBHOOKS: false,
} as const;

// =============================================================================
// HOMEBRIDGE SPECIFIC CONSTANTS
// =============================================================================

export const HOMEBRIDGE_DEFAULTS = {
	DEFAULT_PORT: 8581,
	DEFAULT_PIN: '031-45-154',
	DEFAULT_USERNAME: 'CC:22:3D:E3:CE:30',
} as const;

// =============================================================================
// CHARACTERISTIC TYPES
// =============================================================================

export const CHARACTERISTIC_TYPES = {
	// Common characteristics
	ON: 'On',
	BRIGHTNESS: 'Brightness',
	HUE: 'Hue',
	SATURATION: 'Saturation',
	TEMPERATURE: 'CurrentTemperature',
	TARGET_TEMPERATURE: 'TargetTemperature',
	CURRENT_HEATING_COOLING_STATE: 'CurrentHeatingCoolingState',
	TARGET_HEATING_COOLING_STATE: 'TargetHeatingCoolingState',
	LOCK_TARGET_STATE: 'LockTargetState',
	LOCK_CURRENT_STATE: 'LockCurrentState',
	MOTION_DETECTED: 'MotionDetected',
	CONTACT_SENSOR_STATE: 'ContactSensorState',
	OCCUPANCY_DETECTED: 'OccupancyDetected',
	LEAK_DETECTED: 'LeakDetected',
	SMOKE_DETECTED: 'SmokeDetected',
	CARBON_MONOXIDE_DETECTED: 'CarbonMonoxideDetected',
	BATTERY_LEVEL: 'BatteryLevel',
	CHARGING_STATE: 'ChargingState',
	STATUS_LOW_BATTERY: 'StatusLowBattery',
} as const;

// =============================================================================
// SERVICE TYPES
// =============================================================================

export const SERVICE_TYPES = {
	LIGHTBULB: 'Lightbulb',
	SWITCH: 'Switch',
	OUTLET: 'Outlet',
	THERMOSTAT: 'Thermostat',
	LOCK: 'LockMechanism',
	GARAGE_DOOR: 'GarageDoorOpener',
	SECURITY_SYSTEM: 'SecuritySystem',
	MOTION_SENSOR: 'MotionSensor',
	CONTACT_SENSOR: 'ContactSensor',
	OCCUPANCY_SENSOR: 'OccupancySensor',
	LEAK_SENSOR: 'LeakSensor',
	SMOKE_SENSOR: 'SmokeSensor',
	CARBON_MONOXIDE_SENSOR: 'CarbonMonoxideSensor',
	BATTERY_SERVICE: 'BatteryService',
	FAN: 'Fan',
	WINDOW_COVERING: 'WindowCovering',
	DOOR: 'Door',
	WINDOW: 'Window',
} as const;

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================

export const PAGINATION = {
	DEFAULT_PAGE_SIZE: 100,
	MAX_PAGE_SIZE: 1000,
	DEFAULT_PAGE: 1,
} as const;

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

export const CACHE_CONFIG = {
	ENABLED: true,
	TTL: 300, // 5 minutes
	MAX_SIZE: 100,
} as const;

// =============================================================================
// LOGGING CONFIGURATION
// =============================================================================

export const LOGGING = {
	ENABLED: true,
	LEVEL: 'info', // debug, info, warn, error
	INCLUDE_TIMESTAMPS: true,
	INCLUDE_STACK_TRACE: true,
} as const;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export const FEATURES = {
	ENABLE_VALIDATION: true,
	ENABLE_RETRY: true,
	ENABLE_CACHING: true,
	ENABLE_MCP: true,
	ENABLE_BATCH_OPERATIONS: true,
	ENABLE_WEBHOOKS: false,
	ENABLE_STREAMING: false,
} as const;
