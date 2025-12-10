![title](https://github.com/user-attachments/assets/0c5df183-6436-465b-8afe-2a83732d5be9)

<p align="center">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/next" alt="next-version">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/react" alt="react-version">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/@llm-tools/embedjs" alt="embedjs-version">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/sass" alt="sass-version">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/zod" alt="zod-version">
  <img src="https://img.shields.io/github/package-json/dependency-version/JKerbin/ai-powered-trpg-kp/gsap" alt="gsap-version">
</p>

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app), designed to enhance Tabletop Role-Playing Game (TRPG) experiences through an AI Game Keeper framework.

## Project Overview
AIKP integrates Context Engineering principles, MIRIX-style multi-type memory architecture, and multi-agent collaboration to address key limitations of traditional LLM-based TRPG Game Keepers. The framework transforms flat vector databases into a structured memory system, enabling active retrieval, dynamic context assembly, and improved adherence to TRPG rules and narrative consistency. It supports scenario management, character creation, real-time narrative interaction, and persistent session storage—ideal for TRPGs like *Call of Cthulhu: Black Water*.

## Environmental Installation

First, install the project dependencies:    

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

## Environment Variable Configuration

1. Copy the environment variable example file and rename it to `.env`：

```bash
cp src/agent/.env_example src/agent/.env
```

2. Edit the `.env` file to configure the OpenAI API key and base URL:

```env
# OpenAI API Configuration
OPENAI_API_KEY="your OpenAI API key"
OPENAI_API_BASE="https://api.openai.com/v1"  # or other compatible API endpoint
```

## Getting Started

After installing dependencies and configuring environment variables, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can upload TRPG scenario PDFs, create player characters, and engage in immersive role-play with the AI Game Keeper—no skilled human Game Keeper required!
