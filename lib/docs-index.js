// Nạp và tra cứu tài liệu Tingee từ các file site docs xuất sẵn: llms.txt, llms-full.txt, openapi.json.
const CACHE_TTL_MS = 60 * 60 * 1000

// Bỏ dấu tiếng Việt để tìm "xac thuc" cũng ra "xác thực"
export const normalize = (text) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

const tokenize = (text) => normalize(text).split(/[^a-z0-9]+/).filter((t) => t.length > 1)

export class DocsIndex {
  constructor({ baseUrl = 'https://developers.tingee.vn', lang = 'vi', fetchImpl = fetch } = {}) {
    this.siteUrl = baseUrl.replace(/\/$/, '')
    this.artifactUrl = lang === 'en' ? `${this.siteUrl}/en` : this.siteUrl
    this.fetch = fetchImpl
    this.loadedAt = 0
    this.loading = null
  }

  async ensureLoaded() {
    if (Date.now() - this.loadedAt < CACHE_TTL_MS) return
    this.loading ??= this.load().finally(() => { this.loading = null })
    await this.loading
  }

  async load() {
    const get = async (file) => {
      const res = await this.fetch(`${this.artifactUrl}/${file}`)
      if (!res.ok) throw new Error(`Không tải được ${this.artifactUrl}/${file} (HTTP ${res.status})`)
      return file.endsWith('.json') ? res.json() : res.text()
    }
    const [index, full, openapi] = await Promise.all([get('llms.txt'), get('llms-full.txt'), get('openapi.json')])
    this.indexText = index
    this.pages = parsePages(full)
    this.openapi = openapi
    this.loadedAt = Date.now()
  }

  search(query, limit = 5) {
    const terms = [...new Set(tokenize(query))]
    if (!terms.length) return []
    const phrase = normalize(query.trim())

    return this.pages
      .map((page) => {
        let score = 0
        for (const term of terms) {
          const inTitle = page.titleNorm.split(/[^a-z0-9]+/).includes(term)
          const count = page.contentNorm.split(term).length - 1
          if (!inTitle && !count) continue
          score += (inTitle ? 10 : 0) + Math.min(count, 20)
        }
        // Có đủ mọi từ khoá và cụm từ nguyên vẹn thì ưu tiên hơn
        const matched = terms.filter((t) => page.titleNorm.includes(t) || page.contentNorm.includes(t)).length
        score *= matched / terms.length
        if (phrase.length > 3 && page.contentNorm.includes(phrase)) score += 15
        return { page, score }
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ page }) => ({ title: page.title, url: page.url, snippet: bestSnippet(page.content, terms) }))
  }

  findPage(urlOrPath) {
    const path = urlOrPath.trim().replace(/^https?:\/\/[^/]+/, '').replace(/\.md$/, '').replace(/^\/md(?=\/)/, '').replace(/\/$/, '')
    // So sánh không tính tiền tố /en để dùng chung đường dẫn cho cả hai ngôn ngữ
    const key = (p) => safeDecode(p).replace(/^\/en(?=\/|$)/, '') || '/'
    const wanted = key(path)
    return this.pages.find((p) => key(new URL(p.url).pathname.replace(/\/$/, '')) === wanted)
  }

  // Lấy một mục của trang theo tiêu đề (khớp gần đúng, không dấu)
  section(page, heading) {
    const lines = page.content.split('\n')
    const want = normalize(heading)
    const start = lines.findIndex((l) => /^#{2,4} /.test(l) && normalize(l).includes(want))
    if (start < 0) return null
    const level = lines[start].match(/^#+/)[0].length
    let end = lines.findIndex((l, i) => i > start && /^#{1,6} /.test(l) && l.match(/^#+/)[0].length <= level)
    if (end < 0) end = lines.length
    return lines.slice(start, end).join('\n').trim()
  }

  listEndpoints(query) {
    const terms = query ? tokenize(query) : []
    const rows = []
    for (const [path, ops] of Object.entries(this.openapi.paths ?? {})) {
      for (const [method, op] of Object.entries(ops)) {
        const line = `${method.toUpperCase()} ${path} — ${op.summary ?? ''}${op.tags?.length ? ` [${op.tags.join(', ')}]` : ''}`
        const hay = normalize(`${line} ${op.description ?? ''}`)
        if (terms.every((t) => hay.includes(t))) rows.push(line)
      }
    }
    return rows
  }

  getEndpoint(path, method) {
    const ops = this.openapi.paths?.[path.trim()]
    if (!ops) return null
    const key = method ? method.toLowerCase() : Object.keys(ops)[0]
    const op = ops[key]
    if (!op) return null
    return { method: key.toUpperCase(), path: path.trim(), ...deref(op, this.openapi) }
  }
}

// llms-full.txt: mỗi trang bắt đầu bằng "<!-- URL -->", các trang cách nhau bởi "---"
function parsePages(full) {
  const parts = full.split(/^<!-- (https?:\/\/\S+) -->$/m)
  const pages = []
  for (let i = 1; i < parts.length; i += 2) {
    const content = parts[i + 1].replace(/\n+---\n*$/, '').trim()
    const title = content.match(/^# (.+)$/m)?.[1]?.trim() ?? parts[i]
    pages.push({ url: parts[i], title, content, titleNorm: normalize(title), contentNorm: normalize(content) })
  }
  return pages
}

// Đoạn chứa nhiều từ khoá nhất; bỏ qua đoạn quá ngắn (vd. tên tab "**Java**"), code block cũng được tính
function bestSnippet(content, terms, size = 280) {
  const paragraphs = content.split(/\n{2,}/).map((p) => p.replace(/^```\w*\n?|```$/g, '').trim()).filter((p) => p.length >= 30)
  let best = paragraphs[0] ?? ''
  let bestScore = -1
  for (const p of paragraphs) {
    const n = normalize(p)
    const score = terms.reduce((s, t) => s + (n.includes(t) ? 1 : 0), 0)
    if (score > bestScore) { best = p; bestScore = score }
  }
  const text = best.replace(/\s+/g, ' ').trim()
  return text.length > size ? `${text.slice(0, size)}…` : text
}

// Thay $ref bằng schema thật (tối đa vài tầng, tránh vòng lặp)
function deref(node, root, depth = 0, seen = new Set()) {
  if (Array.isArray(node)) return node.map((n) => deref(n, root, depth, seen))
  if (!node || typeof node !== 'object') return node
  if (typeof node.$ref === 'string') {
    const name = node.$ref.split('/').pop()
    if (seen.has(name) || depth > 6) return { $ref: node.$ref }
    const target = node.$ref.replace(/^#\//, '').split('/').reduce((o, k) => o?.[k], root)
    return { title: name, ...deref(target, root, depth + 1, new Set(seen).add(name)) }
  }
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, deref(v, root, depth, seen)]))
}

const safeDecode = (s) => { try { return decodeURIComponent(s) } catch { return s } }
