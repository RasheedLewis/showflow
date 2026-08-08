import fs from "node:fs/promises";

import { describe, expect, test } from "vitest";

describe("secure Resource streaming", () => {
  test("9.T7 streams media through Electron without loading the full file into memory", async () => {
    const source = await fs.readFile(
      new URL("./resource-protocol.mts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("net.fetch(pathToFileURL(filePath).href)");
    expect(source).toContain("new Response(fileResponse.body");
    expect(source).not.toMatch(
      /readFile\s*\(\s*(?:filePath|resource\.localPath)/u,
    );
  });
});
