# 批次 3 · AI 教练后端（ZCode / GLM）

仓库：`D:\oler-ide-v2`。**只改 `frontend/src-tauri/src/**` 与 scripts；禁止改 `frontend/src/**`。** 不要 git commit。

前端已补全：引导与设置页均可配置 **AI 地址 / Key / 模型**。你负责后端能力：

## 1. `list_ollama_models`（新 command）
- GET `{base}/models`，其中 base 优先 `http://127.0.0.1:11434/v1`，超时 3s
- Ollama 兼容：`GET {origin}/api/tags` 作为回退（去掉 `/v1` 后 `/api/tags`）
- 返回 `Vec<String>` 模型名；失败返回空 Vec（不 Err，前端可隐藏下拉）
- `lib.rs` 注册

## 2. `probe_ai_endpoint`（新 command）
- 入参 base_url, api_key, model
- 极小 `POST {base}/chat/completions`，`max_tokens:1`，超时 8s
- 返回 `Result<String, String>`：Ok("ok") 或 Err(简短原因)
- 用于设置页「测试连接」（前端后续接）

## 3. 默认值
- `AppSettings` 默认 `ai_base_url` 若为空保持现状；不要强制改用户已有 key
- `storage::load_settings` 不必因 env 改 AI 默认

## 4. 单测
- URL 拼接（chat/completions 不重复）
- Ollama tags URL 推导纯函数

## 验收
```
cd D:\oler-ide-v2\frontend\src-tauri
cargo check --all-targets
cargo test --lib
```

输出：改动文件 + 测试摘要。
