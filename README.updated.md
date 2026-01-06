# n8n-nodes-homebridge

[![npm version](https://img.shields.io/npm/v/n8n-nodes-homebridge.svg)](https://www.npmjs.com/package/n8n-nodes-homebridge)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-homebridge.svg)](https://www.npmjs.com/package/n8n-nodes-homebridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An n8n community node that provides **complete integration** with Homebridge API, allowing you to control your HomeKit accessories and manage your Homebridge server through n8n workflows.

**✨ Optimized for MCP (Model Context Protocol)** - Perfect for AI agents and automation!

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## 📑 Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Operations](#operations)
- [Credentials](#credentials)
- [Usage Examples](#usage-examples)
- [MCP Integration](#mcp-integration)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### Comprehensive API Coverage
- **79 API endpoints** - Complete Homebridge API implementation
- **10 resource categories** - Authentication, Server, Config, Plugins, Accessories, Users, Status, Platform, Backup, Setup
- **Type-safe** - Full TypeScript implementation with strict mode
- **Error handling** - Robust error management with user-friendly messages

### Developer Experience
- **Retry logic** - Automatic retry with exponential backoff
- **Validation** - Input validation for all parameters
- **Logging** - Comprehensive logging for debugging
- **Documentation** - Complete JSDoc and inline documentation

### MCP Optimization
- **Batch operations** - Execute multiple operations efficiently
- **Structured metadata** - Every response includes execution metadata
- **Tool definitions** - Ready for AI agent integration
- **Webhook support** - Real-time event handling

### Advanced Features
- **Auto-authentication** - JWT token management
- **Pagination** - Handle large datasets efficiently
- **Caching** - Optional caching for performance
- **Streaming** - Support for long-running operations

---

## 📦 Installation

### Option 1: Via n8n UI (Recommended)

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-homebridge` in **Enter npm package name**
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes
5. Select **Install**

### Option 2: Via npm

```bash
npm install n8n-nodes-homebridge
```

### Option 3: Manual Installation

```bash
git clone https://github.com/paolo-trivi/n8n-nodes-homebridge.git
cd n8n-nodes-homebridge
npm install
npm run build
npm link
```

After installation, restart n8n to see the node in your palette.

---

## 🚀 Quick Start

### 1. Configure Credentials

1. In n8n, create new credentials for **Homebridge API**
2. Enter your Homebridge server details:
   - **Server URL**: `http://your-homebridge-server:8581`
   - **Username**: Your Homebridge username
   - **Password**: Your Homebridge password
   - **Two-Factor Code** (optional): If 2FA is enabled

### 2. Create Your First Workflow

**Simple Status Check:**

```
1. Add "Homebridge" node
2. Select Resource: "Authentication"
3. Select Operation: "Login"
4. Add another "Homebridge" node
5. Select Resource: "Status"
6. Select Operation: "Check Homebridge Status"
7. Connect the nodes and execute
```

**Control a Light:**

```
1. Add "Homebridge" node → Login
2. Add "Homebridge" node → Resource: Accessories, Operation: List
3. Add "Homebridge" node → Resource: Accessories, Operation: Set Characteristic
   - Unique ID: <your-light-id>
   - Characteristic Type: On
   - Value: true
4. Connect and execute
```

---

## 🎯 Operations

### Complete Feature List (79 Operations)

#### 🔐 Authentication (4 operations)
- **Login** - Exchange username/password for access token
- **Get Settings** - Get authentication settings
- **No Auth Token** - Get token when auth is disabled
- **Check Auth** - Verify token validity

#### 🖥️ Server Management (16 operations)
- **Restart Server** - Restart main Homebridge instance
- **Start/Stop/Restart Child Bridge** - Manage child bridges
- **Get Pairing Info** - HomeKit pairing information
- **Reset Homebridge Accessory** - Reset and change PIN
- **Manage Cached Accessories** - CRUD operations for cache
- **Device Pairings** - List, get, and delete pairings
- **Network Interfaces** - System and bridge network config
- **Get Unused Port** - Find available port

#### ⚙️ Config Editor (9 operations)
- **Get/Update Config** - Manage config.json
- **Plugin Configuration** - Get/update plugin configs
- **Enable/Disable Plugins** - Toggle plugin status
- **Config Backups** - List, get, and delete backups

#### 🔌 Plugin Management (8 operations)
- **List Installed** - Show installed plugins
- **Search Plugins** - Search npm registry
- **Lookup Plugin** - Get plugin details
- **Get Versions** - Available plugin versions
- **Config Schema** - Plugin configuration schema
- **Changelog** - Plugin changelog
- **Release Info** - Latest GitHub release
- **Get Alias** - Resolve plugin alias

#### 🏠 Accessories Control (4 operations)
- **List Accessories** - Get all HomeKit accessories
- **Get Layout** - Room and accessory layout
- **Get Accessory** - Single accessory details
- **Set Characteristic** - Control accessory (turn on/off, brightness, etc.)

#### 👥 User Management (8 operations)
- **List Users** - Get all users
- **Create User** - Add new user
- **Update User** - Modify user details
- **Delete User** - Remove user
- **Change Password** - Update password
- **Setup OTP** - Configure 2FA
- **Activate OTP** - Enable 2FA
- **Deactivate OTP** - Disable 2FA

#### 📊 Status Monitoring (10 operations)
- **CPU Info** - Load, history, temperature
- **RAM Info** - Memory usage and history
- **Network Info** - Transfer statistics
- **Uptime** - System and process uptime
- **Homebridge Status** - Server status
- **Child Bridges** - Active child bridges
- **Homebridge Version** - Version information
- **Server Info** - Environment details
- **Node.js Info** - Node version and updates
- **RPi Throttled** - Raspberry Pi throttling status

#### 🛠️ Platform Tools (9 operations)
- **Linux Host Control** - Restart/shutdown host
- **Docker Management** - Startup script and container control
- **HB Service Settings** - Homebridge startup configuration
- **Log Management** - Download and truncate logs

#### 💾 Backup & Restore (9 operations)
- **Create Backup** - Manual backup creation
- **Download Backup** - Get backup file
- **Scheduled Backups** - List and manage auto-backups
- **Restore Operations** - Restore from backup
- **Post-Backup Restart** - Restart after restore

#### 🎬 Setup Wizard (2 operations)
- **Create First User** - Initial setup
- **Get Setup Token** - Setup authentication

---

## 🔑 Credentials

### Homebridge API Credentials

Configure the following in n8n:

| Field | Description | Required | Example |
|-------|-------------|----------|---------|
| **Server URL** | Homebridge server URL with port | Yes | `http://192.168.1.100:8581` |
| **Username** | Your Homebridge username | Yes | `admin` |
| **Password** | Your Homebridge password | Yes | `••••••••` |
| **Two-Factor Code** | 2FA code if enabled | No | `123456` |

**Important Notes:**
- The node automatically handles JWT token authentication
- Tokens are passed between nodes in workflows
- No need to re-authenticate for each operation

---

## 💡 Usage Examples

### Example 1: Basic Authentication and Status

```javascript
// Node 1: Login
{
  "resource": "auth",
  "operation": "login"
}

// Node 2: Get Status (connected to Node 1)
{
  "resource": "status",
  "operation": "getHomebridgeStatus"
}

// Output:
{
  "status": "up",
  "consolePort": 8581,
  "port": 51826,
  "pin": "031-45-154",
  "username": "CC:22:3D:E3:CE:30"
}
```

### Example 2: Control Smart Light

```javascript
// Turn light ON
{
  "resource": "accessories",
  "operation": "setCharacteristic",
  "uniqueId": "00000000-0000-1000-8000-0026BB765291",
  "characteristicType": "On",
  "value": "true"
}

// Set brightness to 75%
{
  "resource": "accessories",
  "operation": "setCharacteristic",
  "uniqueId": "00000000-0000-1000-8000-0026BB765291",
  "characteristicType": "Brightness",
  "value": "75"
}
```

### Example 3: Plugin Management

```javascript
// Search for camera plugins
{
  "resource": "plugins",
  "operation": "search",
  "query": "camera"
}

// Get specific plugin info
{
  "resource": "plugins",
  "operation": "lookup",
  "pluginName": "homebridge-camera-ffmpeg"
}

// Get plugin changelog
{
  "resource": "plugins",
  "operation": "getChangelog",
  "pluginName": "homebridge-camera-ffmpeg"
}
```

### Example 4: Automated Backup

```javascript
// Schedule: Every day at 3 AM

// 1. Login
{ "resource": "auth", "operation": "login" }

// 2. Create Backup
{ "resource": "backup", "operation": "createBackup" }

// 3. List Backups
{ "resource": "backup", "operation": "listScheduledBackups" }

// 4. Send notification with backup status
```

### Example 5: Temperature Monitoring

```javascript
// Schedule: Every 5 minutes

// 1. Login
// 2. Get temperature sensor
{
  "resource": "accessories",
  "operation": "getAccessory",
  "uniqueId": "temperature-sensor-id"
}

// 3. Check temperature value
// 4. If > 30°C, send alert
```

### Example 6: System Health Dashboard

```javascript
// Collect system metrics

// Parallel execution:
// - Get CPU Info
// - Get RAM Info
// - Get Network Info
// - Get Uptime
// - Get Homebridge Status

// Merge results and send to monitoring dashboard
```

---

## 🤖 MCP Integration

### What is MCP?

Model Context Protocol (MCP) enables AI models to interact with external tools and APIs. This node is **fully optimized for MCP**.

### MCP Features

#### 1. **Structured Tool Definitions**

Each operation has a clear schema:

```json
{
  "name": "homebridge_accessories_setCharacteristic",
  "description": "Control a HomeKit accessory by setting a characteristic value",
  "inputSchema": {
    "type": "object",
    "properties": {
      "uniqueId": {
        "type": "string",
        "description": "Unique ID of the accessory"
      },
      "characteristicType": {
        "type": "string",
        "description": "Characteristic to modify (On, Brightness, Temperature, etc.)"
      },
      "value": {
        "type": "string",
        "description": "Value to set"
      }
    },
    "required": ["uniqueId", "characteristicType", "value"]
  }
}
```

#### 2. **Batch Operations**

Execute multiple operations efficiently:

```javascript
{
  "operations": [
    { "resource": "status", "operation": "getHomebridgeStatus" },
    { "resource": "accessories", "operation": "list" },
    { "resource": "plugins", "operation": "listInstalled" }
  ]
}
```

#### 3. **Execution Metadata**

Every response includes metadata:

```json
{
  "data": { "status": "up", ... },
  "_metadata": {
    "resource": "status",
    "operation": "getHomebridgeStatus",
    "executedAt": "2025-01-06T12:00:00.000Z",
    "success": true
  }
}
```

#### 4. **Error Handling**

User-friendly error messages for AI agents:

```json
{
  "error": "Unauthorized",
  "message": "Access token is invalid or expired. Please authenticate again.",
  "statusCode": 401
}
```

### Using with AI Agents

Example with Claude/GPT:

```
System: You have access to Homebridge API via n8n.

User: "Turn on the living room lights and set them to 50% brightness"

Agent:
1. Execute: homebridge_accessories_list
2. Find: living room light uniqueId
3. Execute: homebridge_accessories_setCharacteristic (On=true)
4. Execute: homebridge_accessories_setCharacteristic (Brightness=50)
5. Respond: "✅ Living room lights are now on at 50% brightness"
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### ❌ Authentication Failed

**Problem**: Cannot login to Homebridge

**Solutions**:
- Verify server URL is correct (include port: `:8581`)
- Check username and password
- If 2FA is enabled, provide correct OTP code
- Ensure Homebridge server is running and accessible

#### ❌ No Access Token Available

**Problem**: Error about missing access token

**Solutions**:
- Connect a Login node before other operations
- OR manually enter access token in "Access Token" field
- Ensure Login node executed successfully

#### ❌ Network Timeout

**Problem**: Requests timeout or fail to connect

**Solutions**:
- Check network connectivity to Homebridge server
- Verify firewall settings allow connection on port 8581
- Increase timeout if server is slow (edit GenericFunctions.ts)

#### ❌ Invalid JSON Parameter

**Problem**: Config update fails with JSON error

**Solutions**:
- Validate JSON before passing to node (use JSON validator)
- Check for proper escaping of special characters
- Use JSON.stringify() if building config dynamically

#### ❌ Accessory Not Found

**Problem**: Cannot control specific accessory

**Solutions**:
- List all accessories first to get correct uniqueId
- Verify accessory is actually published to HomeKit
- Check accessory is not cached or deleted

### Enable Debug Logging

For detailed logging:

1. Edit `GenericFunctions.ts`
2. Set `LOGGING.LEVEL = 'debug'` in `constants.ts`
3. Rebuild the node
4. Check n8n logs for detailed output

---

## 📊 Performance Tips

### Optimize Your Workflows

1. **Reuse Access Tokens**
   - Login once, pass token to all subsequent nodes
   - Avoid unnecessary re-authentication

2. **Use Batch Operations**
   - Combine multiple operations when possible
   - Reduces API calls and improves speed

3. **Cache Frequently Used Data**
   - Store accessory lists, plugin configs
   - Refresh only when needed

4. **Implement Error Handling**
   - Enable "Continue on Fail" for non-critical operations
   - Add retry logic for transient failures

5. **Limit Data Retrieval**
   - Use filters to get only what you need
   - Avoid listing all accessories if you need just one

---

## 📚 Resources

### Documentation
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Complete development guide
- [Workflow Examples](./examples/workflows.json) - Ready-to-use workflow templates
- [Homebridge API Reference](https://github.com/homebridge/homebridge-config-ui-x/wiki/API-Reference)
- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

### External Resources
- [Homebridge Official](https://homebridge.io/)
- [Homebridge Plugins](https://www.npmjs.com/search?q=homebridge-plugin)
- [HomeKit Specifications](https://developer.apple.com/homekit/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

### Support
- **GitHub Issues**: [Report bugs or request features](https://github.com/paolo-trivi/n8n-nodes-homebridge/issues)
- **Email**: paolo@trivisonno.dev
- **n8n Community**: [Get help from the community](https://community.n8n.io/)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following our [coding standards](./IMPLEMENTATION_GUIDE.md#contributing)
4. **Add tests** for new functionality
5. **Update documentation** (README, IMPLEMENTATION_GUIDE)
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Setup

```bash
git clone https://github.com/paolo-trivi/n8n-nodes-homebridge.git
cd n8n-nodes-homebridge
npm install
npm run dev
```

### Coding Standards

- Follow TypeScript strict mode
- Add JSDoc comments for all public functions
- Write unit tests for new features
- Use meaningful variable names
- Follow existing code style

---

## 🏗️ Architecture

### File Structure

```
n8n-nodes-homebridge/
├── credentials/
│   └── HomebridgeApi.credentials.ts
├── nodes/Homebridge/
│   ├── Homebridge.node.ts
│   ├── HomebridgeDescription.ts
│   ├── GenericFunctions.ts        # Helper functions
│   ├── types.ts                   # TypeScript types
│   ├── constants.ts               # Configuration
│   └── homebridge-logo.svg
├── examples/
│   └── workflows.json
├── IMPLEMENTATION_GUIDE.md
└── README.md
```

### Key Components

- **GenericFunctions.ts** - Centralized helper functions (auth, HTTP, validation, MCP)
- **types.ts** - Complete TypeScript type definitions
- **constants.ts** - Configuration constants and defaults
- **HomebridgeDescription.ts** - All 79 operation definitions

---

## 📈 Roadmap

### Future Features

- [ ] **WebSocket Support** - Real-time updates for accessories
- [ ] **Plugin Installation** - Install/uninstall plugins via API
- [ ] **Advanced Caching** - Smart caching with invalidation
- [ ] **GraphQL Support** - Alternative to REST API
- [ ] **Bulk Operations** - Update multiple accessories at once
- [ ] **Custom Triggers** - Webhook triggers for accessory state changes
- [ ] **Metrics Dashboard** - Built-in monitoring dashboard
- [ ] **Plugin Recommendations** - AI-powered plugin suggestions

---

## 📄 License

[MIT](https://github.com/paolo-trivi/n8n-nodes-homebridge/blob/main/LICENSE.md)

Copyright (c) 2025 paolo-trivi

---

## 🌟 Acknowledgments

- Thanks to the [n8n team](https://n8n.io/) for the amazing automation platform
- Thanks to the [Homebridge team](https://homebridge.io/) for HomeKit integration
- Thanks to all contributors and users of this package

---

## 📊 Stats

- **79 API Endpoints** - Complete coverage
- **10 Resource Categories** - Comprehensive organization
- **TypeScript** - 100% type-safe code
- **MIT Licensed** - Free and open source
- **MCP Optimized** - Ready for AI agents

---

**Made with ❤️ by [paolo-trivi](https://github.com/paolo-trivi)**

**Star ⭐ this repo if you find it useful!**

---

**Last Updated**: 2025-01-06
**Version**: 2.0.0
**Node.js**: >=20.15.0
**n8n**: >=0.187.0
