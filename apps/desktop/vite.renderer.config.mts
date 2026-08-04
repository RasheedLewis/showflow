import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import {
  DEVELOPMENT_CONTENT_SECURITY_POLICY,
  PRODUCTION_CONTENT_SECURITY_POLICY,
} from "./src/main/security.mts";

export default defineConfig(({ command }) => {
  const contentSecurityPolicy =
    command === "serve"
      ? DEVELOPMENT_CONTENT_SECURITY_POLICY
      : PRODUCTION_CONTENT_SECURITY_POLICY;

  return {
    base: "./",
    plugins: [
      react(),
      {
        name: "showflow-content-security-policy",
        transformIndexHtml: {
          order: "pre",
          handler: (html) =>
            html.replace(
              "{{SHOWFLOW_CONTENT_SECURITY_POLICY}}",
              contentSecurityPolicy,
            ),
        },
      },
    ],
    server: {
      headers: {
        "Content-Security-Policy": contentSecurityPolicy,
      },
    },
  };
});
