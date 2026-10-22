#!/usr/bin/env node
// stdio 진입점: npx nanocalcs-mcp
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server';

const server = createServer();
await server.connect(new StdioServerTransport());
// stdout 은 프로토콜 전용이다. 로그는 stderr 로만 쓴다
console.error('nanocalcs MCP server running on stdio');
