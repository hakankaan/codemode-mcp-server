// src/index.ts
import { CodemodeServer } from "./server.js";

async function main() {
  const server = new CodemodeServer("/Users/kobil/gitRepos/codemode");

  try {
    await server.start();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
