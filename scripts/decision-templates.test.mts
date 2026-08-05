import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const DECISION_DIRECTORY = path.join(REPOSITORY_ROOT, "docs/decisions");

const readDecisionFile = (fileName: string): string =>
  fs.readFileSync(path.join(DECISION_DIRECTORY, fileName), "utf8");

const expectSections = (source: string, sections: string[]): void => {
  for (const section of sections) {
    expect(source).toContain(`## ${section}`);
  }
};

describe("decision record governance", () => {
  test("the register covers every sequential ADR and links every template", () => {
    const files = fs.readdirSync(DECISION_DIRECTORY);
    const adrFiles = files
      .filter((fileName) => /^\d{4}-.+\.md$/u.test(fileName))
      .sort();
    const adrNumbers = adrFiles.map((fileName) => Number(fileName.slice(0, 4)));
    const register = readDecisionFile("README.md");

    expect(adrNumbers).toEqual(
      Array.from({ length: adrNumbers.length }, (_, index) => index + 1),
    );
    for (const fileName of adrFiles) {
      expect(register).toContain(`](${fileName})`);
    }
    for (const template of [
      "adr-template.md",
      "product-decision-request-template.md",
      "open-specification-issue-template.md",
    ]) {
      expect(files).toContain(template);
      expect(register).toContain(`](${template})`);
    }
  });

  test("the ADR template captures choice, tradeoffs, migration, and evidence", () => {
    const source = readDecisionFile("adr-template.md");

    expect(source).toContain("# ADR NNNN:");
    expect(source).toContain("**Status:** Proposed");
    expect(source).toContain("**Deciders:**");
    expect(source).toContain("**Supersedes:**");
    expectSections(source, [
      "Context",
      "Decision drivers",
      "Considered options",
      "Decision",
      "Consequences",
      "Compatibility and migration",
      "Validation",
      "References",
    ]);
  });

  test("the product request separates recommendations from approval", () => {
    const source = readDecisionFile("product-decision-request-template.md");

    expect(source).toContain("**Status:** Open");
    expect(source).toContain("**Decision owner:**");
    expect(source).toContain("**Controlling specification:**");
    expect(source).toContain(
      "recommendations in this request are not approval",
    );
    expectSections(source, [
      "Decision needed",
      "Product constraints",
      "Documented MVP default",
      "Options",
      "Recommendation",
      "Impact while open",
      "Approval record",
      "Required follow-up",
    ]);
    expect(source).toContain("**Affected work that must stop:**");
    expect(source).toContain("**Unrelated work that may continue:**");
  });

  test("the open issue defines the stopped scope and replaceable interim boundary", () => {
    const source = readDecisionFile("open-specification-issue-template.md");

    expect(source).toContain("**Status:** Open");
    expect(source).toContain("OPEN SPECIFICATION or DECISION REQUIRED");
    expect(source).toContain("does not authorize a permanent product");
    expectSections(source, [
      "Exact unresolved question",
      "Specification evidence",
      "Affected scope",
      "Safe interim handling",
      "Resolution required",
      "Resolution record",
      "Required follow-up",
    ]);
    expect(source).toContain("**Work that must stop:**");
    expect(source).toContain("**Replaceable boundary:**");
    expect(source).toContain("**Assumptions explicitly prohibited:**");
  });
});
