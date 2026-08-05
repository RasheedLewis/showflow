import { expect, test } from "vitest";

import {
  DEVELOPMENT_CONTENT_SECURITY_POLICY,
  PRODUCTION_CONTENT_SECURITY_POLICY,
  createSecureWebPreferences,
  getTrustedDevelopmentUrl,
  isApprovedExternalUrl,
  isTrustedApplicationNavigation,
} from "./security.mts";

test("secure web preferences isolate the renderer", () => {
  expect(createSecureWebPreferences("/trusted/preload.js")).toEqual({
    preload: "/trusted/preload.js",
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    navigateOnDragDrop: false,
  });
});

test("development content is restricted to loopback HTTP", () => {
  expect(getTrustedDevelopmentUrl("http://localhost:5173")).toBe(
    "http://localhost:5173/",
  );
  expect(getTrustedDevelopmentUrl("http://127.0.0.1:5173")).toBe(
    "http://127.0.0.1:5173/",
  );
  expect(getTrustedDevelopmentUrl("http://[::1]:5173")).toBe(
    "http://[::1]:5173/",
  );

  for (const untrustedUrl of [
    "https://showflow.example",
    "http://localhost.example:5173",
    "http://user:password@localhost:5173",
    "file:///tmp/index.html",
  ]) {
    expect(() => getTrustedDevelopmentUrl(untrustedUrl)).toThrow();
  }
});

test("only credential-free HTTPS URLs may open externally", () => {
  expect(isApprovedExternalUrl("https://showflow.example/docs")).toBe(true);

  for (const unapprovedUrl of [
    "http://showflow.example",
    "https://user:password@showflow.example",
    "file:///tmp/index.html",
    "javascript:alert(1)",
    "mailto:hello@showflow.example",
    "not a url",
  ]) {
    expect(isApprovedExternalUrl(unapprovedUrl)).toBe(false);
  }
});

test("application navigation stays on its trusted local entry", () => {
  expect(
    isTrustedApplicationNavigation(
      "http://localhost:5173/another-route",
      "http://localhost:5173/",
    ),
  ).toBe(true);
  expect(
    isTrustedApplicationNavigation(
      "http://127.0.0.1:5173/",
      "http://localhost:5173/",
    ),
  ).toBe(false);
  expect(
    isTrustedApplicationNavigation(
      "http://user:password@localhost:5173/",
      "http://localhost:5173/",
    ),
  ).toBe(false);
  expect(
    isTrustedApplicationNavigation(
      "file:///Applications/Showflow/index.html#show",
      "file:///Applications/Showflow/index.html",
    ),
  ).toBe(true);
  expect(
    isTrustedApplicationNavigation(
      "file:///Applications/Showflow/other.html",
      "file:///Applications/Showflow/index.html",
    ),
  ).toBe(false);
});

test("the renderer CSP denies executable and embedded remote content", () => {
  for (const policy of [
    PRODUCTION_CONTENT_SECURITY_POLICY,
    DEVELOPMENT_CONTENT_SECURITY_POLICY,
  ]) {
    expect(policy).toMatch(/default-src 'self'/);
    expect(policy).toMatch(/frame-src 'none'/);
    expect(policy).toMatch(/object-src 'none'/);
    expect(policy).toMatch(/script-src 'self'/);
    expect(policy).not.toMatch(/unsafe-eval/);
    expect(policy).not.toMatch(/https?:\/\/\*/);
  }

  expect(PRODUCTION_CONTENT_SECURITY_POLICY).not.toMatch(/unsafe-inline/);
  expect(PRODUCTION_CONTENT_SECURITY_POLICY).not.toMatch(/ws:\/\//);
  expect(DEVELOPMENT_CONTENT_SECURITY_POLICY).toMatch(/ws:\/\/localhost:\*/);
  expect(DEVELOPMENT_CONTENT_SECURITY_POLICY).toMatch(
    /script-src 'self' 'unsafe-inline'/,
  );
});
