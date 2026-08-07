import type {
  SegmentDataFieldDto,
  SegmentDataFieldTypeDto,
} from "@showflow/contracts";
import {
  Button,
  Checkbox,
  InspectorSection,
  Select,
  TextArea,
  TextInput,
} from "@showflow/ui";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import styles from "./segment-editor.module.css";
import type { SegmentFieldDraft } from "./useSegmentEditorMutations";

const FIELD_TYPE_OPTIONS = [
  { label: "Short text", value: "shortText" },
  { label: "Long text", value: "longText" },
  { label: "Number", value: "number" },
  { label: "Image Resource", value: "imageResource" },
  { label: "Video Resource", value: "videoResource" },
  { label: "Audio Resource", value: "audioResource" },
  { label: "Boolean", value: "boolean" },
] as const;

const draftOf = (field: SegmentDataFieldDto): SegmentFieldDraft => ({
  defaultValue: field.defaultValue,
  helpText: field.helpText,
  label: field.label,
  required: field.required,
  type: field.type,
});

interface FieldCardProps {
  readonly field: SegmentDataFieldDto;
  readonly index: number;
  readonly isLast: boolean;
  readonly onDelete: (fieldId: string) => Promise<void>;
  readonly onMove: (fieldId: string, direction: -1 | 1) => Promise<void>;
  readonly onUpdate: (
    fieldId: string,
    value: SegmentFieldDraft,
  ) => Promise<void>;
}

const FieldCard = ({
  field,
  index,
  isLast,
  onDelete,
  onMove,
  onUpdate,
}: FieldCardProps) => {
  const [draft, setDraft] = useState(() => draftOf(field));
  const draftRef = useRef(draft);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(
    () => () => {
      if (timeout.current !== undefined) {
        clearTimeout(timeout.current);
        void onUpdateRef
          .current(field.id, draftRef.current)
          .catch(() => undefined);
      }
    },
    [field.id],
  );

  const schedule = (next: SegmentFieldDraft): void => {
    draftRef.current = next;
    setDraft(next);
    if (timeout.current !== undefined) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      timeout.current = undefined;
      void onUpdateRef
        .current(field.id, draftRef.current)
        .catch(() => undefined);
    }, 400);
  };

  const update = (patch: Partial<SegmentFieldDraft>): void =>
    schedule({ ...draftRef.current, ...patch });

  const defaultControl = (() => {
    if (draft.type === "boolean") {
      return (
        <Select
          label="Default value"
          onChange={(event) =>
            update({
              defaultValue:
                event.currentTarget.value === "none"
                  ? null
                  : event.currentTarget.value === "true",
            })
          }
          options={[
            { label: "No default", value: "none" },
            { label: "True", value: "true" },
            { label: "False", value: "false" },
          ]}
          value={
            draft.defaultValue === null
              ? "none"
              : draft.defaultValue
                ? "true"
                : "false"
          }
        />
      );
    }
    if (draft.type === "number") {
      return (
        <TextInput
          label="Default value"
          onChange={(event) =>
            update({
              defaultValue:
                event.currentTarget.value === ""
                  ? null
                  : Number(event.currentTarget.value),
            })
          }
          step="any"
          type="number"
          value={
            typeof draft.defaultValue === "number" ? draft.defaultValue : ""
          }
        />
      );
    }
    if (
      draft.type === "imageResource" ||
      draft.type === "videoResource" ||
      draft.type === "audioResource"
    ) {
      return (
        <p className={styles.dependencyCopy}>
          Resource defaults become available with the Resource browser in Sprint
          9.
        </p>
      );
    }
    if (draft.type === "longText") {
      return (
        <TextArea
          label="Default value"
          onChange={(event) =>
            update({ defaultValue: event.currentTarget.value })
          }
          rows={3}
          value={
            typeof draft.defaultValue === "string" ? draft.defaultValue : ""
          }
        />
      );
    }
    return (
      <TextInput
        label="Default value"
        onChange={(event) =>
          update({ defaultValue: event.currentTarget.value })
        }
        value={typeof draft.defaultValue === "string" ? draft.defaultValue : ""}
      />
    );
  })();

  return (
    <article className={styles.fieldCard}>
      <header className={styles.fieldHeader}>
        <div>
          <p className={styles.fieldPosition}>Field {index + 1}</p>
          <code className={styles.fieldKey}>{field.key}</code>
        </div>
        <div className={styles.fieldActions}>
          <Button
            disabled={index === 0}
            onClick={() => void onMove(field.id, -1).catch(() => undefined)}
            size="small"
            variant="ghost"
          >
            Move up
          </Button>
          <Button
            disabled={isLast}
            onClick={() => void onMove(field.id, 1).catch(() => undefined)}
            size="small"
            variant="ghost"
          >
            Move down
          </Button>
        </div>
      </header>
      <TextInput
        label="Field label"
        maxLength={100}
        onChange={(event) => update({ label: event.currentTarget.value })}
        required
        value={draft.label}
      />
      <Select
        label="Field type"
        onChange={(event) =>
          update({
            defaultValue: null,
            type: event.currentTarget.value as SegmentDataFieldTypeDto,
          })
        }
        options={[...FIELD_TYPE_OPTIONS]}
        value={draft.type}
      />
      <Checkbox
        checked={draft.required}
        label="Required for every Episode"
        onChange={(event) => update({ required: event.currentTarget.checked })}
      />
      {defaultControl}
      <TextArea
        label="Help text"
        onChange={(event) =>
          update({ helpText: event.currentTarget.value || null })
        }
        rows={2}
        value={draft.helpText ?? ""}
      />
      {field.episodeValueUsageCount > 0 ? (
        <p className={styles.usageWarning}>
          Used by {field.episodeValueUsageCount} Episode{" "}
          {field.episodeValueUsageCount === 1 ? "Segment" : "Segments"}. Remove
          those values before deleting this field.
        </p>
      ) : null}
      <Button
        disabled={field.episodeValueUsageCount > 0}
        onClick={() => void onDelete(field.id).catch(() => undefined)}
        size="small"
        variant="destructive"
      >
        Delete field
      </Button>
    </article>
  );
};

export interface SegmentDataFieldEditorProps {
  readonly fields: readonly SegmentDataFieldDto[];
  readonly isSaving: boolean;
  readonly onCreate: (
    label: string,
    type: SegmentDataFieldTypeDto,
  ) => Promise<void>;
  readonly onDelete: (fieldId: string) => Promise<void>;
  readonly onReorder: (fieldIds: readonly string[]) => Promise<void>;
  readonly onUpdate: (
    fieldId: string,
    value: SegmentFieldDraft,
  ) => Promise<void>;
}

export const SegmentDataFieldEditor = ({
  fields,
  isSaving,
  onCreate,
  onDelete,
  onReorder,
  onUpdate,
}: SegmentDataFieldEditorProps) => {
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<SegmentDataFieldTypeDto>("shortText");

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const label = newLabel.trim();
    if (label.length === 0) return;
    void onCreate(label, newType)
      .then(() => setNewLabel(""))
      .catch(() => undefined);
  };

  const move = async (fieldId: string, direction: -1 | 1): Promise<void> => {
    const index = fields.findIndex(({ id }) => id === fieldId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= fields.length) return;
    const ids = fields.map(({ id }) => id);
    const [moved] = ids.splice(index, 1);
    if (moved === undefined) return;
    ids.splice(target, 0, moved);
    await onReorder(ids);
  };

  return (
    <InspectorSection
      description="Define the simple content each Episode provides for this reusable Segment."
      heading="Episode fields"
    >
      <form className={styles.fieldCreateForm} onSubmit={submit}>
        <TextInput
          disabled={isSaving}
          label="New field label"
          maxLength={100}
          onChange={(event) => setNewLabel(event.currentTarget.value)}
          placeholder="Guest name"
          required
          value={newLabel}
        />
        <Select
          disabled={isSaving}
          label="New field type"
          onChange={(event) =>
            setNewType(event.currentTarget.value as SegmentDataFieldTypeDto)
          }
          options={[...FIELD_TYPE_OPTIONS]}
          value={newType}
        />
        <Button
          disabled={isSaving || newLabel.trim().length === 0}
          type="submit"
        >
          Add field
        </Button>
      </form>
      {fields.length === 0 ? (
        <p className={styles.emptyFields}>
          No Episode fields yet. Add only the content this Segment needs each
          time it is used.
        </p>
      ) : (
        <ol className={styles.fieldList}>
          {fields.map((field, index) => (
            <li
              key={[
                field.id,
                field.updatedAt,
                field.label,
                field.type,
                field.required,
                field.defaultValue,
                field.helpText,
              ].join(":")}
            >
              <FieldCard
                field={field}
                index={index}
                isLast={index === fields.length - 1}
                onDelete={onDelete}
                onMove={move}
                onUpdate={onUpdate}
              />
            </li>
          ))}
        </ol>
      )}
    </InspectorSection>
  );
};
