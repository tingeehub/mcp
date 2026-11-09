// Định dạng kết quả trả về cho MCP client, dùng chung cho mọi nhóm tool
export const text = (value) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
})

export const fail = (message) => ({ content: [{ type: 'text', text: message }], isError: true })

export const readOnly = { readOnlyHint: true, openWorldHint: true }
