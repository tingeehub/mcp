# @tingee/mcp

MCP server của Tingee, giúp trợ lý AI (Claude, Cursor, VS Code Copilot…) làm việc với Tingee ngay trong lúc viết code.

Tool được chia theo nhóm, bật bằng biến môi trường `TINGEE_TOOLS`. Mặc định chỉ bật nhóm `docs`.

## Nhóm tool

### `docs`: tra cứu tài liệu (mặc định)

Chỉ đọc tài liệu công khai tại [developers.tingee.vn](https://developers.tingee.vn), không cần API key và không gọi API của Tingee.

| Tool | Chức năng |
|:--|:--|
| `search_docs` | Tìm trang tài liệu theo từ khoá (gõ có dấu hay không dấu đều được) |
| `get_doc` | Đọc một trang theo URL / đường dẫn, có thể chỉ lấy một mục |
| `list_docs` | Mục lục tài liệu kèm quy tắc chung (base URL, ký request, mã lỗi) |
| `list_endpoints` | Danh sách endpoint Open API, lọc theo từ khoá |
| `get_endpoint` | Chi tiết tham số và schema của một endpoint |

## Cài đặt

Cần Node.js 18 trở lên.

**Claude Code**

```bash
claude mcp add tingee -- npx -y @tingee/mcp
```

**Claude Desktop, Cursor** (`claude_desktop_config.json`, `.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "tingee": {
      "command": "npx",
      "args": ["-y", "@tingee/mcp"]
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`)

```json
{
  "servers": {
    "tingee": {
      "command": "npx",
      "args": ["-y", "@tingee/mcp"]
    }
  }
}
```

## Cấu hình

| Biến môi trường | Mặc định | Ý nghĩa |
|:--|:--|:--|
| `TINGEE_TOOLS` | `docs` | Các nhóm tool cần bật, cách nhau bởi dấu phẩy |
| `TINGEE_DOCS_LANG` | `vi` | Ngôn ngữ tài liệu: `vi` hoặc `en` |
| `TINGEE_DOCS_URL` | `https://developers.tingee.vn` | Địa chỉ site tài liệu |

Ví dụ dùng tài liệu tiếng Anh: thêm `"env": { "TINGEE_DOCS_LANG": "en" }` vào cấu hình server. Tài liệu được tải khi gọi tool lần đầu và làm mới sau mỗi giờ.

## Liên hệ & Hỗ trợ

📧 **Email:** [developer@heno.vn](mailto:developer@heno.vn)
💬 **Telegram:** [@tingeesupport](https://t.me/tingeesupport)
🌐 **Website:** [tingee.vn](https://tingee.vn)

## Xem thêm

- [Dùng với trợ lý AI](https://developers.tingee.vn/docs/sdk/ai-tools)
- [Tài liệu Tingee Developer](https://developers.tingee.vn)
