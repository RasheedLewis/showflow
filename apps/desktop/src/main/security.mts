import type { WebPreferences } from "electron";

const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "[::1]", "localhost"]);

const BASE_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "font-src 'self'",
  "form-action 'none'",
  "frame-src 'none'",
  "img-src 'self' data: showflow-resource:",
  "manifest-src 'none'",
  "media-src 'self' blob: showflow-resource:",
  "object-src 'none'",
];

export const PRODUCTION_CONTENT_SECURITY_POLICY = [
  ...BASE_CONTENT_SECURITY_POLICY,
  "connect-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
].join("; ");

export const DEVELOPMENT_CONTENT_SECURITY_POLICY = [
  ...BASE_CONTENT_SECURITY_POLICY,
  "connect-src 'self' ws://127.0.0.1:* ws://localhost:*",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

export const createSecureWebPreferences = (
  preloadPath: string,
): WebPreferences => ({
  preload: preloadPath,
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
  navigateOnDragDrop: false,
});

export const getTrustedDevelopmentUrl = (candidate: string): string => {
  const url = new URL(candidate);

  if (
    url.protocol !== "http:" ||
    !LOOPBACK_HOSTNAMES.has(url.hostname) ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error("The desktop development server must use loopback HTTP.");
  }

  return url.href;
};

export const isApprovedExternalUrl = (candidate: string): boolean => {
  try {
    const url = new URL(candidate);

    return (
      url.protocol === "https:" && url.username === "" && url.password === ""
    );
  } catch {
    return false;
  }
};

export const isTrustedApplicationNavigation = (
  candidate: string,
  trustedEntryUrl: string,
): boolean => {
  try {
    const target = new URL(candidate);
    const trusted = new URL(trustedEntryUrl);

    if (target.username !== "" || target.password !== "") {
      return false;
    }

    if (trusted.protocol === "file:") {
      return (
        target.protocol === "file:" && target.pathname === trusted.pathname
      );
    }

    return target.origin === trusted.origin;
  } catch {
    return false;
  }
};
