import type { EpisodeStoryboardDto } from "@showflow/contracts";
import { Badge, Button, Select, TextArea, TextInput } from "@showflow/ui";

import styles from "./episode-segment-editor.module.css";
import type { EpisodeSegmentContentDraft } from "./useEpisodeSegmentContent";

type EpisodeField = EpisodeStoryboardDto["items"][number]["dataFields"][number];
type FieldValue = EpisodeSegmentContentDraft["fieldValues"][string];

const sameJsonValue = (
  left: FieldValue | undefined,
  right: FieldValue | undefined,
): boolean => JSON.stringify(left) === JSON.stringify(right);

const updateFieldValue = (
  draft: EpisodeSegmentContentDraft,
  key: string,
  value: FieldValue | undefined,
): EpisodeSegmentContentDraft => {
  const fieldValues: EpisodeSegmentContentDraft["fieldValues"] =
    value === undefined
      ? Object.fromEntries(
          Object.entries(draft.fieldValues).filter(
            ([fieldKey]) => fieldKey !== key,
          ),
        )
      : { ...draft.fieldValues, [key]: value };
  return { ...draft, fieldValues };
};

export const EpisodeSegmentFieldControl = ({
  draft,
  field,
  issue,
  onUpdate,
}: {
  readonly draft: EpisodeSegmentContentDraft;
  readonly field: EpisodeField;
  readonly issue?: string | undefined;
  readonly onUpdate: (next: EpisodeSegmentContentDraft) => void;
}) => {
  const value = draft.fieldValues[field.key];
  const inputId = `episode-field-${field.key}`;
  const overridden = !sameJsonValue(
    value,
    field.defaultValue === null
      ? undefined
      : (field.defaultValue as FieldValue),
  );
  const reset = (): void =>
    onUpdate(
      updateFieldValue(
        draft,
        field.key,
        field.defaultValue === null
          ? undefined
          : (field.defaultValue as FieldValue),
      ),
    );
  const source = (
    <div className={styles.sourceRow}>
      <Badge tone="neutral">Show default</Badge>
      {overridden ? <Badge tone="accent">Episode override</Badge> : null}
      {overridden ? (
        <Button onClick={reset} size="small" variant="ghost">
          Reset to Show default
        </Button>
      ) : null}
    </div>
  );
  let control;
  if (field.type === "longText") {
    control = (
      <TextArea
        {...(issue === undefined ? {} : { error: issue })}
        {...(field.helpText === null ? {} : { helpText: field.helpText })}
        id={inputId}
        label={field.label}
        onChange={(event) =>
          onUpdate(
            updateFieldValue(draft, field.key, event.currentTarget.value),
          )
        }
        required={field.required}
        value={typeof value === "string" ? value : ""}
      />
    );
  } else if (field.type === "number") {
    control = (
      <TextInput
        {...(issue === undefined ? {} : { error: issue })}
        {...(field.helpText === null ? {} : { helpText: field.helpText })}
        id={inputId}
        label={field.label}
        onChange={(event) => {
          const next = event.currentTarget.value;
          onUpdate(
            updateFieldValue(
              draft,
              field.key,
              next === "" ? undefined : Number(next),
            ),
          );
        }}
        required={field.required}
        type="number"
        value={typeof value === "number" ? String(value) : ""}
      />
    );
  } else if (field.type === "boolean") {
    control = (
      <Select
        {...(issue === undefined ? {} : { error: issue })}
        {...(field.helpText === null ? {} : { helpText: field.helpText })}
        id={inputId}
        label={field.label}
        onChange={(event) =>
          onUpdate(
            updateFieldValue(
              draft,
              field.key,
              event.currentTarget.value === ""
                ? undefined
                : event.currentTarget.value === "true",
            ),
          )
        }
        options={[
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ]}
        placeholder="Choose yes or no"
        required={field.required}
        value={typeof value === "boolean" ? String(value) : ""}
      />
    );
  } else if (
    field.type === "imageResource" ||
    field.type === "videoResource" ||
    field.type === "audioResource"
  ) {
    control = (
      <TextInput
        {...(issue === undefined ? {} : { error: issue })}
        disabled
        helpText="Resource selection arrives with the secure Resource Browser in Sprint 9."
        id={inputId}
        label={field.label}
        placeholder="Choose a Resource in Sprint 9"
        required={field.required}
        value={typeof value === "string" ? "Resource selected" : ""}
      />
    );
  } else {
    control = (
      <TextInput
        {...(issue === undefined ? {} : { error: issue })}
        {...(field.helpText === null ? {} : { helpText: field.helpText })}
        id={inputId}
        label={field.label}
        onChange={(event) =>
          onUpdate(
            updateFieldValue(draft, field.key, event.currentTarget.value),
          )
        }
        required={field.required}
        value={typeof value === "string" ? value : ""}
      />
    );
  }

  return (
    <div className={styles.fieldGroup}>
      {control}
      {source}
    </div>
  );
};
