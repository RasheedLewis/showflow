import assert from "node:assert/strict";
import test from "node:test";

import {
  DEVELOPMENT_CONTENT_SECURITY_POLICY,
  PRODUCTION_CONTENT_SECURITY_POLICY,
  createSecureWebPreferences,
  getTrustedDevelopmentUrl,
  isApprovedExternalUrl,
  isTrustedApplicationNavigation,
} from "./security.mts";

test("secure web preferences isolate the renderer", () => {
  assert.deepEqual(createSecureWebPreferences("/trusted/preload.js"), {
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
  assert.equal(
    getTrustedDevelopmentUrl("http://localhost:5173"),
    "http://localhost:5173/",
  );
  assert.equal(
    getTrustedDevelopmentUrl("http://127.0.0.1:5173"),
    "http://127.0.0.1:5173/",
  );
  assert.equal(
    getTrustedDevelopmentUrl("http://[::1]:5173"),
    "http://[::1]:5173/",
  );

  for (const untrustedUrl of [
    "https://showflow.example",
    "http://localhost.example:5173",
    "http://user:password@localhost:5173",
    "file:///tmp/index.html",
  ]) {
    assert.throws(() => getTrustedDevelopmentUrl(untrustedUrl));
  }
});

test("only credential-free HTTPS URLs may open externally", () => {
  assert.equal(isApprovedExternalUrl("https://showflow.example/docs"), true);

  for (const unapprovedUrl of [
    "http://showflow.example",
    "https://user:password@showflow.example",
    "file:///tmp/index.html",
    "javascript:alert(1)",
    "mailto:hello@showflow.example",
    "not a url",
  ]) {
    assert.equal(isApprovedExternalUrl(unapprovedUrl), false);
  }
});

test("application navigation stays on its trusted local entry", () => {
  assert.equal(
    isTrustedApplicationNavigation(
      "http://localhost:5173/another-route",
      "http://localhost:5173/",
    ),
    true,
  );
  assert.equal(
    isTrustedApplicationNavigation(
      "http://127.0.0.1:5173/",
      "http://localhost:5173/",
    ),
    false,
  );
  assert.equal(
    isTrustedApplicationNavigation(
      "http://user:password@localhost:5173/",
      "http://localhost:5173/",
    ),
    false,
  );
  assert.equal(
    isTrustedApplicationNavigation(
      "file:///Applications/Showflow/index.html#show",
      "file:///Applications/Showflow/index.html",
    ),
    true,
  );
  assert.equal(
    isTrustedApplicationNavigation(
      "file:///Applications/Showflow/other.html",
      "file:///Applications/Showflow/index.html",
    ),
    false,
  );
});

test("the renderer CSP denies executable and embedded remote content", () => {
  for (const policy of [
    PRODUCTION_CONTENT_SECURITY_POLICY,
    DEVELOPMENT_CONTENT_SECURITY_POLICY,
  ]) {
    assert.match(policy, /default-src 'self'/);
    assert.match(policy, /frame-src 'none'/);
    assert.match(policy, /object-src 'none'/);
    assert.match(policy, /script-src 'self'/);
    assert.doesNotMatch(policy, /unsafe-eval/);
    assert.doesNotMatch(policy, /https?:\/\/\*/);
  }

  assert.doesNotMatch(PRODUCTION_CONTENT_SECURITY_POLICY, /unsafe-inline/);
  assert.doesNotMatch(PRODUCTION_CONTENT_SECURITY_POLICY, /ws:\/\//);
  assert.match(DEVELOPMENT_CONTENT_SECURITY_POLICY, /ws:\/\/localhost:\*/);
  assert.match(
    DEVELOPMENT_CONTENT_SECURITY_POLICY,
    /script-src 'self' 'unsafe-inline'/,
  );
});
