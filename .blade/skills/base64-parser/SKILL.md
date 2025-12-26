---
name: base64-parser
description: 解析 Base64 编码的数据，可以处理 JSON 格式或其他文本格式的 Base64 编码内容
allowed-tools: Read, Write, Edit
version: 1.0.0
user-invocable: true
---

# Base64 解析器技能

## 功能描述
此技能用于解析 Base64 编码的数据。它可以处理 JSON 格式或其他文本格式的 Base64 编码内容，并将其转换为可读格式。

## 使用场景
- 解析 Base64 编码的配置数据
- 解码 Base64 编码的 API 响应
- 查看 Base64 编码的文本内容

## 参数
- `base64String`: 要解析的 Base64 编码字符串

## 示例
```
base64String: eyJ0ZXN0IjogInRlc3QifQ==
```

## 执行逻辑
1. 接收 Base64 编码的字符串
2. 解码为 UTF-8 文本
3. 尝试解析为 JSON 对象（如果适用）
4. 返回解析结果