import type {
  EpisodeStoryboardDto,
  ResourceContext,
} from "@showflow/contracts";
import { Badge, Button, Select, TextArea, TextInput } from "@showflow/ui";

import styles from "./episode-segment-editor.module.css";
import type { EpisodeSegmentContentDraft } from "./useEpisodeSegmentContent";
import { ResourcePicker } from "../resources/ResourcePicker";

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
  resourceContext,
}: {
  readonly draft: EpisodeSegmentContentDraft;
  readonly field: EpisodeField;
  readonly issue?: string | undefined;
  readonly onUpdate: (next: EpisodeSegmentContentDraft) => void;
  readonly resourceContext: ResourceContext;
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
    const category =
      field.type === "imageResource"
        ? "image"
        : field.type === "videoResource"
          ? "video"
          : "audio";
    control = (
      <ResourcePicker
        category={category}
        context={resourceContext}
        inputId={inputId}
        {...(issue === undefined ? {} : { issue })}
        label={field.label}
        onSelect={(resourceId) =>
          onUpdate(updateFieldValue(draft, field.key, resourceId))
        }
        required={field.required}
        {...(typeof value === "string" ? { selectedResourceId: value } : {})}
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
