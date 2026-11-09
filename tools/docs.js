// Nhóm tool "docs": tra cứu tài liệu công khai, không cần API key và không gọi API Tingee.
// Cấu hình: TINGEE_DOCS_LANG=vi|en (mặc định vi), TINGEE_DOCS_URL (mặc định https://developers.tingee.vn)
import { z } from 'zod'
import { DocsIndex } from '../lib/docs-index.js'
import { fail, readOnly, text } from '../lib/result.js'

export function registerDocsTools(server, env = process.env) {
  const docs = new DocsIndex({
    baseUrl: env.TINGEE_DOCS_URL || 'https://developers.tingee.vn',
    lang: env.TINGEE_DOCS_LANG === 'en' ? 'en' : 'vi',
  })

  // Mọi tool đều cần dữ liệu docs; lỗi tải được trả về cho client thay vì làm sập server
  const withDocs = (handler) => async (args) => {
    try {
      await docs.ensureLoaded()
      return await handler(args)
    } catch (error) {
      return fail(`Lỗi khi đọc tài liệu Tingee: ${error.message}`)
    }
  }

  server.registerTool('search_docs', {
    title: 'Tìm trong tài liệu Tingee',
    description: 'Tìm các trang tài liệu Tingee (Open API, webhook, thư viện backend Node.js/Java/C#/PHP/Python) theo từ khoá. Trả về tiêu đề, URL và đoạn trích; dùng get_doc để đọc cả trang.',
    inputSchema: {
      query: z.string().min(1).describe('Từ khoá, ví dụ "tạo QR động", "verify webhook signature", "createVa java"'),
      limit: z.number().int().min(1).max(10).optional().describe('Số kết quả tối đa, mặc định 5'),
    },
    annotations: readOnly,
  }, withDocs(async ({ query, limit }) => {
    const results = docs.search(query, limit ?? 5)
    if (!results.length) return text(`Không tìm thấy trang nào cho "${query}". Thử từ khoá khác hoặc dùng list_docs để xem mục lục.`)
    return text(results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.snippet}`).join('\n\n'))
  }))

  server.registerTool('get_doc', {
    title: 'Đọc một trang tài liệu',
    description: 'Lấy nội dung Markdown của một trang tài liệu Tingee theo URL hoặc đường dẫn (ví dụ /docs/sdk/webhook). Có thể chỉ lấy một mục theo tiêu đề để tiết kiệm ngữ cảnh.',
    inputSchema: {
      url: z.string().min(1).describe('URL đầy đủ hoặc đường dẫn, ví dụ "/docs/qr/dynamic/generate-dynamic-qr"'),
      section: z.string().optional().describe('Tiêu đề mục cần lấy, ví dụ "Xác thực URL webhook"'),
    },
    annotations: readOnly,
  }, withDocs(async ({ url, section }) => {
    const page = docs.findPage(url)
    if (!page) return fail(`Không có trang "${url}". Dùng search_docs hoặc list_docs để tìm đúng đường dẫn.`)
    if (!section) return text(`<!-- ${page.url} -->\n${page.content}`)
    const part = docs.section(page, section)
    return part ? text(`<!-- ${page.url} -->\n${part}`) : fail(`Trang ${page.url} không có mục "${section}".`)
  }))

  server.registerTool('list_docs', {
    title: 'Mục lục tài liệu',
    description: 'Mục lục toàn bộ tài liệu Tingee theo nhóm, kèm quy tắc chung (base URL, header ký request, mã lỗi).',
    inputSchema: {},
    annotations: readOnly,
  }, withDocs(async () => text(docs.indexText)))

  server.registerTool('list_endpoints', {
    title: 'Danh sách API',
    description: 'Liệt kê các endpoint Open API của Tingee (method, path, mô tả, nhóm). Có thể lọc theo từ khoá.',
    inputSchema: {
      query: z.string().optional().describe('Lọc theo từ khoá trong path / mô tả, ví dụ "dynamic-qr", "direct-debit"'),
    },
    annotations: readOnly,
  }, withDocs(async ({ query }) => {
    const rows = docs.listEndpoints(query)
    return rows.length ? text(rows.join('\n')) : text(`Không có endpoint nào khớp "${query}".`)
  }))

  server.registerTool('get_endpoint', {
    title: 'Chi tiết một API',
    description: 'Chi tiết một endpoint Open API: tham số, schema request/response (đã giải $ref). Lấy path từ list_endpoints.',
    inputSchema: {
      path: z.string().min(1).describe('Path, ví dụ "/v1/generate-dynamic-qr"'),
      method: z.string().optional().describe('HTTP method nếu path có nhiều method'),
    },
    annotations: readOnly,
  }, withDocs(async ({ path, method }) => {
    const endpoint = docs.getEndpoint(path, method)
    return endpoint ? text(endpoint) : fail(`Không có endpoint ${method ? `${method.toUpperCase()} ` : ''}${path}. Dùng list_endpoints để xem danh sách.`)
  }))
}
