# MonadHub-MCP: Comprehensive Monad Network Tool Suite

## Overview
A comprehensive MCP (Message Control Protocol) server for the Monad network, providing tools for NFT creation, token trading, price predictions, and more.

## How to add new tools

Update `app/mcp.ts` with your tools, prompts, and resources following the [MCP TypeScript SDK documentation](https://github.com/modelcontextprotocol/typescript-sdk/tree/main?tab=readme-ov-file#server).

## Notes for running on Vercel

- Requires a Redis attached to the project under `process.env.REDIS_URL`
- Make sure you have [Fluid compute](https://vercel.com/docs/functions/fluid-compute) enabled for efficient execution
- After enabling Fluid compute, open `app/sse/route.ts` and adjust max duration to 800 if you using a Vercel Pro or Enterprise account
- [Deploy the Next.js MCP template](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)

## Sample Client

`script/test-client.mjs` contains a sample client to try invocations.

```sh
node scripts/test-client.mjs http://localhost:3000
```

## How to use the server

Go to `Cursor > Settings > Cursor Settings > MCP`

![add_mcp](/static/add_mcp.png)

Paste the following in the `mcp.json` file

```json
{
  "mcpServers": {
    ...
    "monadhub-mcp": {
      "url": "[your_app_vercel_url]/sse"
    }
  }
}
```