# Reference Implementation

This directory contains **reference implementation files** that are NOT compiled or used by the active node.

## Purpose

These files serve as:
- Code examples for future development
- Reference architecture following best practices
- Template for implementing advanced features
- Documentation of recommended patterns

## Files

### GenericFunctions.ts
Centralized helper functions demonstrating:
- Authentication handling with retry logic
- HTTP request wrappers with error handling
- Input validation utilities
- Data transformation helpers
- MCP (Model Context Protocol) support
- Pagination handling
- Utility functions (formatting, parsing, etc.)

**Use this as a template when:**
- Implementing retry logic
- Adding error handling
- Creating reusable helper functions
- Building MCP-compatible operations

### types.ts
Complete TypeScript type definitions for:
- All API request/response types
- Authentication types
- Server, Accessory, Plugin types
- User and Status types
- Error types
- MCP types

**Use this when:**
- Adding type safety to new operations
- Documenting API structures
- Creating interfaces for new features

### constants.ts
Configuration constants including:
- API configuration (timeouts, retries)
- Resource and operation names
- Error/success messages
- Validation patterns (regex)
- MCP configuration
- Homebridge defaults
- Characteristic and service types

**Use this when:**
- Centralizing configuration values
- Adding new validation patterns
- Defining constant values

### Homebridge.node.improved.ts
Example node implementation showing how to use GenericFunctions, types, and constants together.

**Use this as a reference when:**
- Refactoring the main node
- Implementing new features
- Understanding the recommended architecture

## How to Use

1. **Review** these files to understand best practices
2. **Copy** relevant functions/types into your implementation
3. **Adapt** the code to your specific needs
4. **Test** thoroughly before deploying

## Important Notes

- These files are **excluded from compilation** (see tsconfig.json)
- They are **NOT included in the npm package distribution**
- The active node uses `Homebridge.node.ts` and `HomebridgeDescription.ts`
- To use this code in production, copy it to `nodes/Homebridge/` and update imports

## Future Development

When ready to implement these improvements:

1. Create a new branch
2. Copy desired files from `reference/` to `nodes/Homebridge/`
3. Update `Homebridge.node.ts` to import and use the new functions
4. Test thoroughly
5. Update version in `package.json`
6. Publish

## See Also

- [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md) - Complete development guide
- [examples/workflows.json](../examples/workflows.json) - Workflow examples
- [README.md](../README.md) - Main documentation
