import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  webServer: [
    {
      command: "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
    },
    {
      // Local Auth reaches this mock GitHub at host.docker.internal (docs/oauth-testing.md).
      command: "node e2e/mock-github.ts",
      port: 54399,
      reuseExistingServer: true,
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    launchOptions: { args: ["--host-resolver-rules=MAP host.docker.internal 127.0.0.1"] },
  },
});
