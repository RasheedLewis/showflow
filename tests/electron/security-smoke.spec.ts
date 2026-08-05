import fs from "node:fs";
import path from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";
import type { ShowflowDesktopApi } from "@showflow/contracts";

type ElectronRendererWindow = Window & {
  readonly process?: {
    readonly versions?: { readonly node?: string };
  };
  readonly require?: unknown;
  readonly showflow?: ShowflowDesktopApi;
};

const getPackagedExecutablePath = (): string => {
  const packageDirectory = path.resolve(
    import.meta.dirname,
    "../../apps/desktop/out",
    `Showflow-${process.platform}-${process.arch}`,
  );

  let executablePath: string;

  switch (process.platform) {
    case "darwin":
      executablePath = path.join(
        packageDirectory,
        "Showflow.app/Contents/MacOS/showflow",
      );
      break;
    case "linux":
      executablePath = path.join(packageDirectory, "showflow");
      break;
    case "win32":
      executablePath = path.join(packageDirectory, "showflow.exe");
      break;
    default:
      throw new Error(
        `Showflow does not define an Electron smoke target for ${process.platform}.`,
      );
  }

  if (!fs.existsSync(executablePath)) {
    throw new Error(
      `The packaged Showflow executable is missing at ${executablePath}. Run pnpm build first.`,
    );
  }

  return executablePath;
};

test("the packaged app preserves the renderer security boundary", async () => {
  const application = await electron.launch({
    executablePath: getPackagedExecutablePath(),
  });

  try {
    const page = await application.firstWindow();

    await expect(
      page.getByRole("heading", { level: 1, name: "Showflow is ready." }),
    ).toBeVisible();
    await expect(
      page.getByRole("banner", { name: "Showflow application" }),
    ).toBeVisible();

    const securityState = await page.evaluate(async () => {
      const rendererWindow = window as ElectronRendererWindow;

      return {
        apiVersion: rendererWindow.showflow?.apiVersion,
        hasNodeProcessApi:
          typeof rendererWindow.process?.versions?.node === "string",
        hasRequire: typeof rendererWindow.require !== "undefined",
        runtimeInfo: await rendererWindow.showflow?.app.getRuntimeInfo(),
      };
    });

    expect(securityState.hasRequire).toBe(false);
    expect(securityState.hasNodeProcessApi).toBe(false);
    expect(securityState.apiVersion).toBe("1.0.0");
    expect(securityState.runtimeInfo).toMatchObject({ ok: true });

    const trustedEntryUrl = page.url();
    await page.evaluate(() => {
      const externalLink = document.createElement("a");
      externalLink.href = "http://showflow.example/untrusted-navigation";
      externalLink.textContent = "Untrusted navigation";
      document.body.append(externalLink);
      externalLink.click();
    });

    await page.waitForTimeout(250);
    expect(page.url()).toBe(trustedEntryUrl);
  } finally {
    await application.close();
  }
});
