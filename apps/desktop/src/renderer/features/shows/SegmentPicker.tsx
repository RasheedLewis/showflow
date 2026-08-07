import type { SegmentCatalogItemDto } from "@showflow/contracts";
import { Button, Drawer, TextArea, TextInput } from "@showflow/ui";
import { useMemo, useState } from "react";

import styles from "./design-show.module.css";

export interface SegmentPickerProps {
  readonly isSaving: boolean;
  readonly mode: "blueprint" | "catalog" | "episode";
  readonly onAdd: (showSegmentId: string) => Promise<void>;
  readonly onCreate: (input: {
    readonly description?: string;
    readonly name: string;
  }) => Promise<void>;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly segments: readonly SegmentCatalogItemDto[];
}

export const SegmentPicker = ({
  isSaving,
  mode,
  onAdd,
  onCreate,
  onOpenChange,
  open,
  segments,
}: SegmentPickerProps) => {
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string>();
  const visibleSegments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return segments
      .filter(({ segment }) => segment.archivedAt === null)
      .filter(
        ({ segment }) =>
          query.length === 0 ||
          segment.name.toLocaleLowerCase().includes(query),
      )
      .sort((left, right) =>
        left.segment.name.localeCompare(right.segment.name),
      );
  }, [search, segments]);

  const submit = async (): Promise<void> => {
    if (name.trim().length === 0) {
      setFormError("Enter a reusable Segment name.");
      return;
    }
    setFormError(undefined);
    try {
      await onCreate({
        name,
        ...(description.trim().length === 0 ? {} : { description }),
      });
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Showflow could not create the Segment.",
      );
    }
  };

  return (
    <Drawer
      description={
        mode === "catalog"
          ? "Create a reusable production role for this Show."
          : "Choose a reusable Segment or create one at Show scope."
      }
      onOpenChange={onOpenChange}
      open={open}
      title={mode === "catalog" ? "New Segment" : "Add Segment"}
    >
      {mode !== "catalog" ? (
        <>
          <TextInput
            label="Search Segment Catalog"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name"
            type="search"
            value={search}
          />
          <ul className={styles.pickerList}>
            {visibleSegments.map(({ blueprintUsageCount, segment }) => (
              <li className={styles.pickerItem} key={segment.id}>
                <div className={styles.pickerItemCopy}>
                  <p className={styles.pickerItemTitle}>{segment.name}</p>
                  <p className={styles.metadata}>
                    {blueprintUsageCount === 0
                      ? "Not used in Blueprint"
                      : `Used ${blueprintUsageCount} ${blueprintUsageCount === 1 ? "time" : "times"}`}
                  </p>
                </div>
                <Button
                  disabled={isSaving}
                  onClick={() => {
                    setFormError(undefined);
                    void onAdd(segment.id)
                      .then(() => onOpenChange(false))
                      .catch((error: unknown) => {
                        setFormError(
                          error instanceof Error
                            ? error.message
                            : "Showflow could not add the Segment.",
                        );
                      });
                  }}
                  size="small"
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
          <hr className={styles.formDivider} />
        </>
      ) : null}

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextInput
          {...(formError === undefined ? {} : { error: formError })}
          label="Segment name"
          maxLength={200}
          onChange={(event) => setName(event.target.value)}
          placeholder="Opening"
          required
          value={name}
        />
        <TextArea
          label="Description (optional)"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe this reusable production role."
          value={description}
        />
        <div className={styles.pickerActions}>
          <Button disabled={isSaving} type="submit" variant="primary">
            {mode === "catalog" ? "Create Segment" : "Create and Add"}
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
};
