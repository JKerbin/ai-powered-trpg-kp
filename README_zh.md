![title](https://github.com/user-attachments/assets/0c5df183-6436-465b-8afe-2a83732d5be9)

<p align="center">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/next" alt="next-version">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/react" alt="react-version">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/@llm-tools/embedjs" alt="embedjs-version">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/sass" alt="sass-version">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/zod" alt="zod-version">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/gsap" alt="gsap-version">
</p>

这是一个基于 [Next.js](https://nextjs.org) 的项目，使用 [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) 引导创建，旨在通过 AI 守秘人框架增强桌面角色扮演游戏 (TRPG) 体验。

## 项目概述
AIKP 集成了上下文工程原理的多类型记忆架构和多智能体协作，以解决传统基于 LLM 的 TRPG 游戏管理员的关键局限性。该框架将扁平的向量数据库转变为结构化的记忆系统，实现了主动检索、动态上下文组装，并提高了对 TRPG 规则和叙事一致性的遵守。它支持场景管理、角色创建、实时叙事交互和持久化会话存储。

## 环境安装

首先，安装项目依赖：

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

## 环境变量配置

1. 复制环境变量示例文件并将其重命名为 `.env`：

```bash
cp src/agent/.env_example src/agent/.env
```

2. 编辑 `.env` 文件，配置 OpenAI API 密钥和基础 URL：

```env
# OpenAI API 配置
OPENAI_API_KEY="你的 OpenAI API 密钥"
OPENAI_API_BASE="https://api.openai.com/v1"  # 或其他兼容的 API 端点
```

## 快速开始

安装依赖并配置环境变量后，运行开发服务器：

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

使用浏览器打开 [http://localhost:3000](http://localhost:3000) 查看结果。您可以上传 TRPG 场景 PDF 文件，创建玩家角色，并与 AI 守秘人进行沉浸式角色扮演