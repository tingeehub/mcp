// Kiểm tra server khởi động qua stdio và đăng ký đủ tool của từng nhóm (không gọi mạng). Chạy: npm run check
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { fileURLToPath } from 'node:url'

const EXPECTED = {
  docs: ['search_docs', 'get_doc', 'list_docs', 'list_endpoints', 'get_endpoint'],
}

const entry = fileURLToPath(new URL('../index.js', import.meta.url))
let failed = false

for (const [group, tools] of Object.entries(EXPECTED)) {
  const client = new Client({ name: 'check', version: '1.0.0' })
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [entry], env: { ...process.env, TINGEE_TOOLS: group } }))
  const names = (await client.listTools()).tools.map((t) => t.name)
  await client.close()

  const missing = tools.filter((t) => !names.includes(t))
  console.log(`${missing.length ? '✗' : '✓'} ${group}: ${names.join(', ')}${missing.length ? ` (thiếu ${missing.join(', ')})` : ''}`)
  failed ||= missing.length > 0
}

process.exit(failed ? 1 : 0)
