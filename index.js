#!/usr/bin/env node
// MCP server của Tingee. Mỗi nhóm tool nằm trong tools/, bật bằng TINGEE_TOOLS (mặc định "docs").
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerDocsTools } from './tools/docs.js'

// Nhóm tool hiện có; thêm nhóm mới thì tạo file trong tools/ và khai báo ở đây
const TOOL_GROUPS = {
  docs: registerDocsTools,
}

const enabled = (process.env.TINGEE_TOOLS || 'docs').split(',').map((s) => s.trim()).filter(Boolean)
const unknown = enabled.filter((name) => !TOOL_GROUPS[name])
if (unknown.length) {
  // stdout dành cho giao thức MCP nên cảnh báo ghi ra stderr
  console.error(`[tingee-mcp] Bỏ qua nhóm tool không tồn tại: ${unknown.join(', ')}. Các nhóm có sẵn: ${Object.keys(TOOL_GROUPS).join(', ')}`)
}

const server = new McpServer({ name: 'tingee', version: '0.1.0' })
for (const name of enabled) TOOL_GROUPS[name]?.(server, process.env)

await server.connect(new StdioServerTransport())
