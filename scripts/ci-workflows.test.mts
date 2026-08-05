import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";
import { parseDocument } from "yaml";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const WORKFLOW_DIRECTORY = path.join(REPOSITORY_ROOT, ".github/workflows");

const PINNED_CHECKOUT =
  "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
const PINNED_PNPM_SETUP = "pnpm/setup@5d160c5bc68a09337ad0d5654e237e03253b5879";
const PINNED_UPLOAD_ARTIFACT =
  "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a";

type UnknownRecord = Record<string, unknown>;

interface ParsedWorkflow {
  readonly data: UnknownRecord;
  readonly source: string;
}

const requireRecord = (value: unknown, context: string): UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${context} must be a mapping.`);
  }

  return value as UnknownRecord;
};

const requireArray = (value: unknown, context: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${context} must be a sequence.`);
  }

  return value;
};

const parseWorkflow = (fileName: string): ParsedWorkflow => {
  const source = fs.readFileSync(
    path.join(WORKFLOW_DIRECTORY, fileName),
    "utf8",
  );
  const document = parseDocument(source, { uniqueKeys: true });

  expect(document.errors.map((error) => error.message)).toEqual([]);

  return {
    data: requireRecord(document.toJS() as unknown, fileName),
    source,
  };
};

const getJob = (workflow: UnknownRecord, jobName: string): UnknownRecord => {
  const jobs = requireRecord(workflow["jobs"], "jobs");

  return requireRecord(jobs[jobName], `jobs.${jobName}`);
};

const getSteps = (job: UnknownRecord): UnknownRecord[] =>
  requireArray(job["steps"], "job steps").map((step, index) =>
    requireRecord(step, `job step ${index + 1}`),
  );

const getStringValues = (records: UnknownRecord[], key: string): string[] =>
  records
    .map((record) => record[key])
    .filter((value): value is string => typeof value === "string");

const getActionStep = (
  steps: UnknownRecord[],
  action: string,
): UnknownRecord => {
  const step = steps.find((candidate) => candidate["uses"] === action);

  if (!step) {
    throw new Error(`The workflow is missing the ${action} action.`);
  }

  return step;
};

const expectReadOnlyWorkflow = (workflow: UnknownRecord): void => {
  expect(requireRecord(workflow["permissions"], "permissions")).toEqual({
    contents: "read",
  });
};

const expectPinnedActions = (
  steps: UnknownRecord[],
  expectedActions: string[],
): void => {
  const actions = getStringValues(steps, "uses");

  expect(actions).toEqual(expectedActions);
  for (const action of actions) {
    expect(action).toMatch(/^[^@]+@[a-f0-9]{40}$/u);
  }
};

const expectPinnedToolchain = (steps: UnknownRecord[]): void => {
  const checkout = getActionStep(steps, PINNED_CHECKOUT);
  const setup = getActionStep(steps, PINNED_PNPM_SETUP);

  expect(requireRecord(checkout["with"], "checkout inputs")).toEqual({
    "persist-credentials": false,
  });
  expect(requireRecord(setup["with"], "pnpm setup inputs")).toEqual({
    version: "11.4.0",
    runtime: "node@24.18.0",
    cache: true,
    install: false,
  });
};

describe("GitHub Actions workflows", () => {
  test("the pull-request workflow runs every required quality gate", () => {
    const { data, source } = parseWorkflow("quality.yml");
    const events = requireRecord(data["on"], "quality triggers");
    const push = requireRecord(events["push"], "push trigger");
    const verifyJob = getJob(data, "verify");
    const steps = getSteps(verifyJob);

    expect(Object.keys(events).sort()).toEqual([
      "pull_request",
      "push",
      "workflow_dispatch",
    ]);
    expect(push["branches"]).toEqual(["main"]);
    expect(verifyJob["runs-on"]).toBe("ubuntu-24.04");
    expect(getStringValues(steps, "run")).toEqual([
      "pnpm install --frozen-lockfile",
      "pnpm format:check",
      "pnpm lint",
      "pnpm typecheck",
      "pnpm test:unit",
      "pnpm test:renderer",
      "pnpm test:boundaries",
      "pnpm build",
    ]);
    expectPinnedActions(steps, [PINNED_CHECKOUT, PINNED_PNPM_SETUP]);
    expectPinnedToolchain(steps);
    expectReadOnlyWorkflow(data);
    expect(source).not.toMatch(/secrets\./u);
  });

  test("the packaging workflow is manual, unsigned, and cross-platform", () => {
    const { data, source } = parseWorkflow("package-platforms.yml");
    const events = requireRecord(data["on"], "packaging triggers");
    const packageJob = getJob(data, "package");
    const strategy = requireRecord(packageJob["strategy"], "package strategy");
    const matrix = requireRecord(strategy["matrix"], "package matrix");
    const platforms = requireArray(matrix["include"], "package platforms").map(
      (platform, index) =>
        requireRecord(platform, `package platform ${index + 1}`),
    );
    const steps = getSteps(packageJob);

    expect(Object.keys(events)).toEqual(["workflow_dispatch"]);
    expect(packageJob["runs-on"]).toBe("${{ matrix.runner }}");
    expect(platforms).toEqual([
      { runner: "macos-15", artifact: "showflow-macos-arm64" },
      { runner: "windows-2025", artifact: "showflow-windows-x64" },
      { runner: "ubuntu-24.04", artifact: "showflow-linux-x64" },
    ]);
    expect(getStringValues(steps, "run")).toEqual([
      "pnpm install --frozen-lockfile",
      "pnpm package",
    ]);
    expectPinnedActions(steps, [
      PINNED_CHECKOUT,
      PINNED_PNPM_SETUP,
      PINNED_UPLOAD_ARTIFACT,
    ]);
    expectPinnedToolchain(steps);
    expect(
      requireRecord(
        getActionStep(steps, PINNED_UPLOAD_ARTIFACT)["with"],
        "artifact inputs",
      ),
    ).toEqual({
      name: "${{ matrix.artifact }}",
      path: "apps/desktop/out/**",
      "if-no-files-found": "error",
      "retention-days": 7,
      "compression-level": 0,
    });
    expectReadOnlyWorkflow(data);
    expect(source).not.toMatch(/secrets\./u);
    expect(source).not.toMatch(
      /\b(?:codesign|sign|signed|signing|notari[sz]e|publish|release)\b/iu,
    );
  });
});
