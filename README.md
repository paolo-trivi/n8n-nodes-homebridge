# n8n-nodes-homebridge

An n8n community node that provides comprehensive integration with Homebridge API, allowing you to control your HomeKit accessories and manage your Homebridge server through n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

1. Go to **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-homebridge` in **Enter npm package name**.
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes: select **I understand the risks of installing unverified code from a public source**.
5. Select **Install**.

After installing the node, you can use it like any other node in n8n.

## Operations

This node provides access to the complete Homebridge API with 10 resource categories and 70+ operations:

### Authentication
- Login with username/password (with optional 2FA)
- Get authentication settings
- Check authentication status
- No-auth token (when authentication is disabled)

### Server Management  
- Restart Homebridge server
- Start/stop/restart child bridges
- Get pairing information
- Reset Homebridge accessory
- Manage cached accessories
- Network interface configuration

### Configuration Editor
- Get/update Homebridge config.json
- Manage plugin configurations
- Enable/disable plugins
- Config backup management

### Plugin Management
- List installed plugins
- Search NPM registry for plugins
- Get plugin information and versions
- Access config schemas and changelogs

### Accessories Control
- List all HomeKit accessories
- Get/set accessory characteristics
- Manage room layouts
- Control smart home devices

### User Management
- Create, update, delete users
- Change passwords
- Setup/manage 2FA (OTP)
- User permissions

### System Status
- CPU, RAM, network monitoring
- System uptime information
- Homebridge version details
- Child bridge status

### Platform Tools
- Linux host control (restart/shutdown)
- Docker container management
- HB Service configuration
- Log file management

### Backup & Restore
- Create and download backups
- Scheduled backup management
- Restore operations
- System recovery

### Setup Wizard
- Initial setup operations
- First user creation
- Setup token generation

## Credentials

To use this node, you need to configure the Homebridge API credentials:

1. **Server URL**: Your Homebridge server URL (e.g., `http://your-homebridge-server:8581`)
2. **Username**: Your Homebridge username
3. **Password**: Your Homebridge password  
4. **Two-Factor Code** (optional): 2FA code if enabled

The node automatically handles JWT token authentication and renewal.

## Compatibility

- **n8n version**: 0.187.0 or later
- **Homebridge UI**: Compatible with homebridge-config-ui-x
- **Node.js**: 20.15.0 or later

## Usage

### Basic Example: Get System Status

```javascript
// Get Homebridge status
{
  "resource": "status",
  "operation": "getHomebridgeStatus"
}

// Result: { "status": "up", "uptime": 123456, ... }
```

### Advanced Example: Control Accessory

```javascript
// Turn on a light
{
  "resource": "accessories", 
  "operation": "setCharacteristic",
  "uniqueId": "your-accessory-id",
  "characteristicType": "On",
  "value": "true"
}
```

### Plugin Management

```javascript
// Search for plugins
{
  "resource": "plugins",
  "operation": "search", 
  "query": "camera"
}

// Install/update plugin via config
{
  "resource": "config",
  "operation": "updatePluginConfig",
  "pluginName": "homebridge-camera-ffmpeg",
  "pluginConfig": [...]
}
```

## Features

- **Complete API Coverage**: All 70+ Homebridge API endpoints  
- **Automatic Authentication**: JWT token management  
- **Type Safety**: Full TypeScript implementation  
- **Error Handling**: Comprehensive error management  
- **n8n Standards**: Follows n8n best practices  
- **Real-time Control**: Direct HomeKit accessory control  
- **Server Management**: Full Homebridge administration  

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Homebridge](https://homebridge.io/)
* [Homebridge Config UI X API](https://github.com/homebridge/homebridge-config-ui-x/wiki/API-Reference)

## License

[MIT](https://github.com/paolo-trivi/n8n-nodes-homebridge/blob/main/LICENSE.md)
