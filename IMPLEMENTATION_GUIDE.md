# Homebridge n8n Node - Implementation Guide

## 📚 Complete Development Guide

This guide provides comprehensive information about the Homebridge n8n node implementation, including architecture, best practices, and optimization for MCP (Model Context Protocol).

---

## 🏗️ Architecture Overview

### File Structure

```
n8n-nodes-homebridge/
├── credentials/
│   └── HomebridgeApi.credentials.ts      # Authentication credentials
├── nodes/
│   └── Homebridge/
│       ├── Homebridge.node.ts            # Original node implementation
│       ├── Homebridge.node.improved.ts   # Improved implementation with GenericFunctions
│       ├── HomebridgeDescription.ts      # Complete operation descriptions
│       ├── GenericFunctions.ts           # Centralized helper functions
│       ├── types.ts                      # TypeScript type definitions
│       ├── constants.ts                  # Configuration constants
│       └── homebridge-logo.svg           # Node icon
├── examples/
│   └── workflows.json                    # Ready-to-use workflow examples
├── package.json                          # Node package configuration
├── tsconfig.json                         # TypeScript configuration
└── README.md                             # User documentation
```

---

## 🔧 Core Components

### 1. **GenericFunctions.ts**

Centralized helper functions for:

#### Authentication
- `getCredentials()` - Retrieve and validate credentials
- `authenticate()` - Login and get access token
- `getAccessToken()` - Extract token from input or parameters

#### HTTP Requests
- `homebridgeApiRequest()` - Make authenticated API requests
- `homebridgeApiRequestWithRetry()` - Retry logic with exponential backoff
- `handleApiError()` - User-friendly error messages

#### Data Transformation
- `simplifyOutput()` - Clean up API responses
- `parseJsonSafely()` - Safe JSON parsing with error handling
- `validateRequiredParameters()` - Parameter validation

#### Validation
- `isValidUrl()` - URL format validation
- `isValidEmail()` - Email format validation
- `isValidPort()` - Port number validation
- `isValidUuid()` - UUID format validation

#### MCP Support
- `generateMcpToolDefinition()` - Generate MCP tool schemas
- `executeBatchOperations()` - Execute multiple operations
- `handlePaginatedRequest()` - Handle paginated responses

#### Utilities
- `sleep()` - Async delay
- `formatDate()` - ISO date formatting
- `formatBytes()` - Human-readable byte sizes
- `formatDuration()` - Human-readable durations
- `deepMerge()` - Deep object merging

### 2. **types.ts**

Comprehensive TypeScript definitions:

- **Authentication Types**: `IHomebridgeCredentials`, `IAuthLoginResponse`, etc.
- **Server Types**: `ICachedAccessory`, `IDevicePairing`, `INetworkInterface`
- **Accessory Types**: `IAccessory`, `ICharacteristic`, `IAccessoryLayout`
- **Plugin Types**: `IPlugin`, `IPluginSearchResult`, `IPluginConfigSchema`
- **User Types**: `IUser`, `ICreateUserRequest`, `IOtpSetupResponse`
- **Status Types**: `ICpuInfo`, `IRamInfo`, `IHomebridgeStatus`
- **Error Types**: `HomebridgeApiError`, `IHomebridgeError`
- **MCP Types**: `IMcpToolDefinition`, `IMcpBatchOperation`

### 3. **constants.ts**

Configuration values:

- API configuration (timeout, retries, status codes)
- Resource and operation constants
- Error and success messages
- Validation patterns (regex)
- MCP configuration
- Homebridge defaults
- Characteristic and service types

---

## 🎯 Implementation Best Practices

### 1. **Error Handling**

```typescript
try {
  const result = await homebridgeApiRequest.call(
    this,
    'GET',
    '/api/accessories',
    undefined,
    undefined,
    i,
  );
} catch (error) {
  // Error is already transformed to user-friendly message
  if (this.continueOnFail()) {
    returnData.push({
      json: { error: error.message },
      pairedItem: { item: i },
    });
    continue;
  }
  throw error;
}
```

### 2. **Parameter Validation**

```typescript
const uniqueId = this.getNodeParameter('uniqueId', i) as string;
const characteristicType = this.getNodeParameter('characteristicType', i) as string;
const value = this.getNodeParameter('value', i) as string;

// Validate all required parameters
GenericFunctions.validateRequiredParameters.call(
  this,
  { uniqueId, characteristicType, value },
  i,
);
```

### 3. **JSON Parsing**

```typescript
const configString = this.getNodeParameter('config', i) as string;
const config = GenericFunctions.parseJsonSafely.call(
  this,
  configString,
  'config',
  i,
);
```

### 4. **Retry Logic**

The `homebridgeApiRequestWithRetry()` function automatically retries on:
- Status codes: 429, 500, 502, 503, 504
- Maximum retries: 3
- Exponential backoff: 1s, 2s, 4s

### 5. **Output Simplification**

```typescript
const responseData = await homebridgeApiRequest.call(...);
const simplifiedData = GenericFunctions.simplifyOutput(responseData);

returnData.push({
  json: {
    ...simplifiedData,
    _metadata: {
      resource,
      operation,
      executedAt: new Date().toISOString(),
      success: true,
    },
  },
});
```

---

## 🤖 MCP (Model Context Protocol) Optimization

### What is MCP?

MCP is a protocol that allows AI models to interact with external tools and APIs. This node is optimized to work as an MCP server.

### MCP Features

1. **Tool Definitions**
   - Each operation has a structured schema
   - Clear input/output definitions
   - Descriptive names and parameters

2. **Batch Operations**
   - Execute multiple operations in one request
   - Efficient for complex automations
   - Reduced API calls

3. **Structured Metadata**
   - Every response includes execution metadata
   - Success/failure status
   - Timestamps for auditing

### Example MCP Tool Definition

```typescript
{
  name: "homebridge_accessories_setCharacteristic",
  description: "Homebridge: Set value of an accessory characteristic",
  inputSchema: {
    type: "object",
    properties: {
      uniqueId: {
        type: "string",
        description: "The unique ID of the accessory"
      },
      characteristicType: {
        type: "string",
        description: "The characteristic type to set (e.g., 'On', 'Brightness')"
      },
      value: {
        type: "string",
        description: "The value to set"
      }
    },
    required: ["uniqueId", "characteristicType", "value"]
  }
}
```

### Using Batch Operations

```typescript
const operations = [
  { method: 'GET', endpoint: '/api/status/homebridge' },
  { method: 'GET', endpoint: '/api/accessories' },
  { method: 'GET', endpoint: '/api/plugins' },
];

const results = await GenericFunctions.executeBatchOperations.call(
  this,
  operations,
);
```

---

## 📊 Complete API Endpoint Mapping

### Authentication (4 endpoints)
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/settings` - Get auth settings
- `POST /api/auth/noauth` - Get token without auth
- `GET /api/auth/check` - Check token validity

### Server Management (16 endpoints)
- `PUT /api/server/restart` - Restart Homebridge
- `PUT /api/server/restart/:id` - Restart child bridge
- `PUT /api/server/start/:id` - Start child bridge
- `PUT /api/server/stop/:id` - Stop child bridge
- `GET /api/server/pairing` - Get pairing info
- `PUT /api/server/reset-homebridge-accessory` - Reset accessory
- `PUT /api/server/reset-cached-accessories` - Reset cache
- `GET /api/server/cached-accessories` - List cached accessories
- `DELETE /api/server/cached-accessories` - Delete multiple cached
- `DELETE /api/server/cached-accessories/:uuid` - Delete single cached
- `GET /api/server/pairings` - List all pairings
- `GET /api/server/pairings/:id` - Get single pairing
- `DELETE /api/server/pairings/:id` - Delete pairing
- `GET /api/server/port/new` - Get unused port
- `GET /api/server/network-interfaces/system` - System interfaces
- `GET /api/server/network-interfaces/bridge` - Bridge interfaces
- `PUT /api/server/network-interfaces/bridge` - Set interfaces

### Config Editor (9 endpoints)
- `GET /api/config-editor` - Get config.json
- `POST /api/config-editor` - Update config
- `GET /api/config-editor/plugin/:name` - Get plugin config
- `POST /api/config-editor/plugin/:name` - Update plugin config
- `PUT /api/config-editor/plugin/:name/disable` - Disable plugin
- `PUT /api/config-editor/plugin/:name/enable` - Enable plugin
- `GET /api/config-editor/backups` - List config backups
- `GET /api/config-editor/backups/:id` - Get backup
- `DELETE /api/config-editor/backups` - Delete all backups

### Plugin Management (8 endpoints)
- `GET /api/plugins` - List installed plugins
- `GET /api/plugins/search/:query` - Search plugins
- `GET /api/plugins/lookup/:name` - Lookup plugin
- `GET /api/plugins/lookup/:name/versions` - Get versions
- `GET /api/plugins/config-schema/:name` - Get schema
- `GET /api/plugins/changelog/:name` - Get changelog
- `GET /api/plugins/release/:name` - Get release info
- `GET /api/plugins/alias/:name` - Get alias

### Accessories Control (4 endpoints)
- `GET /api/accessories` - List all accessories
- `GET /api/accessories/layout` - Get layout
- `GET /api/accessories/:id` - Get single accessory
- `PUT /api/accessories/:id` - Set characteristic

### User Management (8 endpoints)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/change-password` - Change password
- `POST /api/users/otp/setup` - Setup 2FA
- `POST /api/users/otp/activate` - Activate 2FA
- `POST /api/users/otp/deactivate` - Deactivate 2FA

### Status Monitoring (10 endpoints)
- `GET /api/status/cpu` - CPU information
- `GET /api/status/ram` - RAM information
- `GET /api/status/network` - Network statistics
- `GET /api/status/uptime` - Uptime information
- `GET /api/status/homebridge` - Homebridge status
- `GET /api/status/homebridge/child-bridges` - Child bridges
- `GET /api/status/homebridge-version` - Version info
- `GET /api/status/server-information` - Server info
- `GET /api/status/nodejs` - Node.js info
- `GET /api/status/rpi/throttled` - RPi throttled status

### Platform Tools (9 endpoints)
- `PUT /api/platform-tools/linux/restart-host` - Restart Linux host
- `PUT /api/platform-tools/linux/shutdown-host` - Shutdown host
- `GET /api/platform-tools/docker/startup-script` - Get startup.sh
- `PUT /api/platform-tools/docker/startup-script` - Update startup.sh
- `PUT /api/platform-tools/docker/restart-container` - Restart container
- `GET /api/platform-tools/hb-service/homebridge-startup-settings` - Get settings
- `PUT /api/platform-tools/hb-service/homebridge-startup-settings` - Set settings
- `GET /api/platform-tools/hb-service/log/download` - Download log
- `PUT /api/platform-tools/hb-service/log/truncate` - Truncate log

### Backup & Restore (9 endpoints)
- `POST /api/backup` - Create backup
- `GET /api/backup/download` - Download backup
- `GET /api/backup/scheduled-backups/next` - Next backup time
- `GET /api/backup/scheduled-backups` - List scheduled
- `GET /api/backup/scheduled-backups/:id` - Get backup
- `DELETE /api/backup/scheduled-backups/:id` - Delete backup
- `POST /api/backup/scheduled-backups/:id/restore` - Restore backup
- `PUT /api/backup/restore/trigger` - Trigger restore
- `PUT /api/backup/restart` - Post-restore restart

### Setup Wizard (2 endpoints)
- `POST /api/setup-wizard/create-first-user` - Create first user
- `GET /api/setup-wizard/get-setup-wizard-token` - Get setup token

**Total: 79 API endpoints - ALL IMPLEMENTED** ✅

---

## 🧪 Testing

### Unit Testing

Create tests for GenericFunctions:

```typescript
import * as GenericFunctions from './GenericFunctions';

describe('GenericFunctions', () => {
  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(GenericFunctions.isValidUrl('http://localhost:8581')).toBe(true);
      expect(GenericFunctions.isValidUrl('https://homebridge.local')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(GenericFunctions.isValidUrl('not-a-url')).toBe(false);
      expect(GenericFunctions.isValidUrl('')).toBe(false);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(GenericFunctions.formatBytes(1024)).toBe('1 KB');
      expect(GenericFunctions.formatBytes(1048576)).toBe('1 MB');
    });
  });
});
```

### Integration Testing

Test actual API calls in a development environment:

1. Set up a local Homebridge instance
2. Configure credentials in n8n
3. Test each operation category
4. Verify error handling
5. Check MCP compatibility

---

## 🚀 Deployment

### Publishing to npm

1. Update version in `package.json`
2. Build the package:
   ```bash
   npm run build
   ```
3. Test locally:
   ```bash
   npm link
   ```
4. Publish:
   ```bash
   npm publish
   ```

### Installing in n8n

1. Via UI:
   - Settings > Community Nodes
   - Install `n8n-nodes-homebridge`

2. Via CLI:
   ```bash
   npm install n8n-nodes-homebridge
   ```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Authentication Failed
- **Cause**: Invalid credentials or 2FA code
- **Solution**: Verify username, password, and OTP in credentials

#### 2. Network Timeout
- **Cause**: Homebridge server unreachable
- **Solution**: Check server URL and network connectivity

#### 3. Invalid JSON Parameter
- **Cause**: Malformed JSON in config fields
- **Solution**: Validate JSON before passing to node

#### 4. Access Token Not Found
- **Cause**: No login node connected or manual token missing
- **Solution**: Connect login node or provide token manually

#### 5. Rate Limit Exceeded
- **Cause**: Too many requests in short time
- **Solution**: Add delays between requests or use batch operations

---

## 📈 Performance Optimization

### Best Practices

1. **Reuse Access Tokens**
   - Login once, use token for multiple operations
   - Pass token between nodes instead of re-authenticating

2. **Batch Operations**
   - Use MCP batch operations for multiple calls
   - Reduces overhead and improves performance

3. **Caching**
   - Cache frequently accessed data (accessories, plugins)
   - Set appropriate TTL based on data volatility

4. **Pagination**
   - Use pagination for large datasets
   - Limit results to what you actually need

5. **Error Handling**
   - Enable "Continue on Fail" for non-critical operations
   - Implement fallback logic for resilience

---

## 🔐 Security Best Practices

1. **Credentials Storage**
   - Always use n8n credentials, never hardcode
   - Enable 2FA on Homebridge for extra security

2. **HTTPS**
   - Use HTTPS for Homebridge server
   - Verify SSL certificates in production

3. **Access Control**
   - Create dedicated n8n user with minimal permissions
   - Regularly rotate passwords

4. **Audit Logging**
   - Monitor workflow executions
   - Track API usage and errors

---

## 📝 Contributing

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/paolo-trivi/n8n-nodes-homebridge.git
   cd n8n-nodes-homebridge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

4. Make changes and test locally

5. Build and validate:
   ```bash
   npm run build
   npm run lint
   ```

### Contribution Guidelines

- Follow TypeScript strict mode
- Add JSDoc comments for all functions
- Write tests for new features
- Update README and this guide
- Follow n8n naming conventions
- Ensure backwards compatibility

---

## 📚 Resources

- [n8n Documentation](https://docs.n8n.io/)
- [Homebridge API Reference](https://github.com/homebridge/homebridge-config-ui-x/wiki/API-Reference)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

## 📧 Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/paolo-trivi/n8n-nodes-homebridge/issues
- Email: paolo@trivisonno.dev

---

## 📄 License

MIT License - see LICENSE.md for details

---

**Last Updated**: 2025-01-06
**Version**: 2.0.0
**Author**: paolo-trivi
