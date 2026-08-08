import { Badge, Button, EmptyState, ObjectCard, TextInput } from "@showflow/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { layoutCatalogQueryKey, loadLayoutCatalog } from "./layout-queries";
import styles from "./layouts.module.css";

interface LayoutCatalogProps {
  readonly onNew: () => void;
  readonly onOpen: (layoutId: string) => void;
  readonly showId: string;
  readonly studioId: string;
}

export const LayoutCatalog = ({
  onNew,
  onOpen,
  showId,
  studioId,
}: LayoutCatalogProps) => {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string>();
  const [renamingId, setRenamingId] = useState<string>();
  const [renameValue, setRenameValue] = useState("");
  const query = useQuery({
    queryFn: () => loadLayoutCatalog(studioId, showId),
    queryKey: layoutCatalogQueryKey(studioId, showId),
    retry: false,
  });
  const items = useMemo(
    () =>
      (query.data ?? []).filter(({ layout }) =>
        layout.name
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()),
      ),
    [query.data, search],
  );
  const run = async (
    operation: "archive" | "duplicate" | "rename",
    layoutId: string,
    name?: string,
  ): Promise<void> => {
    setError(undefined);
    const result =
      operation === "archive"
        ? await window.showflow.layouts.archive({ studioId, showId, layoutId })
        : operation === "duplicate"
          ? await window.showflow.layouts.duplicate({
              studioId,
              showId,
              layoutId,
            })
          : await window.showflow.layouts.rename({
              studioId,
              showId,
              layoutId,
              name: name ?? "",
            });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await client.invalidateQueries({
      queryKey: layoutCatalogQueryKey(studioId, showId),
    });
  };
  if (query.isPending) return <p>Loading Layout Catalog…</p>;
  if (query.isError)
    return (
      <p className={styles.error} role="alert">
        {query.error.message}
      </p>
    );
  return (
    <div className={styles.catalog}>
      <div className={styles.catalogToolbar}>
        <TextInput
          className={styles.search}
          label="Search Layouts"
          onChange={(event) => setSearch(event.currentTarget.value)}
          type="search"
          value={search}
        />
        <span>
          {items.length} Layout{items.length === 1 ? "" : "s"}
        </span>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          action={
            <Button leadingIcon="plus" onClick={onNew} variant="primary">
              New Layout
            </Button>
          }
          description={
            search
              ? "Try a different search."
              : "Create a reusable audience composition for this Show."
          }
          heading={search ? "No matching Layouts" : "No Layouts yet"}
        />
      ) : (
        <ul className={styles.catalogGrid}>
          {items.map(({ layout, usageCount }) => (
            <li key={layout.id}>
              <ObjectCard
                actions={
                  renamingId === layout.id ? (
                    <>
                      <TextInput
                        aria-label={`New name for ${layout.name}`}
                        label="Layout name"
                        onChange={(event) =>
                          setRenameValue(event.currentTarget.value)
                        }
                        value={renameValue}
                      />
                      <Button
                        disabled={renameValue.trim().length === 0}
                        onClick={async () => {
                          await run("rename", layout.id, renameValue);
                          setRenamingId(undefined);
                        }}
                        size="small"
                        variant="primary"
                      >
                        Save name
                      </Button>
                      <Button
                        onClick={() => setRenamingId(undefined)}
                        size="small"
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => void run("duplicate", layout.id)}
                        size="small"
                        variant="ghost"
                      >
                        Duplicate
                      </Button>
                      <Button
                        onClick={() => {
                          setRenamingId(layout.id);
                          setRenameValue(layout.name);
                        }}
                        size="small"
                        variant="ghost"
                      >
                        Rename
                      </Button>
                      <Button
                        onClick={() => void run("archive", layout.id)}
                        size="small"
                        variant="destructive"
                      >
                        Archive
                      </Button>
                    </>
                  )
                }
                actionsVisible
                description={`${layout.aspectRatio} · ${usageCount} Segment use${usageCount === 1 ? "" : "s"}`}
                metadata={
                  <Badge tone="neutral">
                    {layout.slots.length} Slot
                    {layout.slots.length === 1 ? "" : "s"}
                  </Badge>
                }
                id={`navigation-origin-layout-${layout.id}`}
                onOpen={() => onOpen(layout.id)}
                preview={
                  <div
                    className={styles.layoutPreview}
                    data-ratio={layout.aspectRatio}
                    style={{
                      aspectRatio: layout.aspectRatio.replace(":", " / "),
                    }}
                  >
                    {layout.slots.map((slot) => (
                      <span
                        key={slot.id}
                        style={{
                          left: `${slot.bounds.x * 100}%`,
                          top: `${slot.bounds.y * 100}%`,
                          width: `${slot.bounds.width * 100}%`,
                          height: `${slot.bounds.height * 100}%`,
                          zIndex: slot.layerOrder,
                        }}
                      />
                    ))}
                  </div>
                }
                title={layout.name}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
