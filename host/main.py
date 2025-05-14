import asyncio
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from mcp_use import MCPAgent, MCPClient

load_dotenv()

CONFIG = {
        "mcpServers": {
            "meilisearch-mcp": {
                "command": "node",
                "args": ["dist/index.js"],
                "envFile": ".env",
            }
        }
    }

async def main():
    client = MCPClient.from_dict(CONFIG)
    llm = ChatOpenAI(model="gpt-4o")

    agent = MCPAgent(llm=llm, client=client, max_steps=20)

    result = await agent.run("test")
    print(result)

    await client.close_all_sessions()

if __name__ == "__main__":
    asyncio.run(main())