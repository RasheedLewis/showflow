import type { SegmentCatalogItemDto } from "@showflow/contracts";
import {
  Button,
  EmptyState,
  IconButton,
  Menu,
  MenuItem,
  ObjectCard,
  Select,
  TextInput,
} from "@showflow/ui";
import { useMemo, useState } from "react";

import styles from "./design-show.module.css";

export interface SegmentCatalogProps {
  readonly items: readonly SegmentCatalogItemDto[];
  readonly onAdd?: (showSegmentId: string) => void;
  readonly onArchive: (showSegmentId: string) => void;
  readonly onOpen: (showSegmentId: string) => void;
}

type CatalogSort = "recent" | "alphabetical";

export const SegmentCatalog = ({
  items,
  onAdd,
  onArchive,
  onOpen,
}: SegmentCatalogProps) => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CatalogSort>("recent");
  const [selectedId, setSelectedId] = useState<string>();
  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return items
      .filter(({ segment }) => segment.archivedAt === null)
      .filter(
        ({ segment }) =>
          query.length === 0 ||
          segment.name.toLocaleLowerCase().includes(query) ||
          (segment.description?.toLocaleLowerCase().includes(query) ?? false),
      )
      .sort((left, right) =>
        sort === "alphabetical"
          ? left.segment.name.localeCompare(right.segment.name)
          : right.segment.updatedAt.localeCompare(left.segment.updatedAt),
      );
  }, [items, search, sort]);

  return (
    <section aria-label="Segment Catalog">
      <div className={styles.catalogToolbar}>
        <div className={styles.catalogControls}>
          <TextInput
            className={styles.search}
            label="Search Segments"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name"
            type="search"
            value={search}
          />
          <Select
            className={styles.sort}
            label="Sort Segments"
            onChange={(event) => setSort(event.target.value as CatalogSort)}
            options={[
              { label: "Recently edited", value: "recent" },
              { label: "Alphabetical", value: "alphabetical" },
            ]}
            value={sort}
          />
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className={styles.emptyWrap}>
          <EmptyState
            action={null}
            description={
              search.trim().length === 0
                ? "Create reusable production roles to use throughout this Show."
                : "Try another name or create a reusable Segment."
            }
            heading={
              search.trim().length === 0
                ? "Build the Segment Catalog"
                : "No Segments match your search"
            }
            icon="plus"
          />
        </div>
      ) : (
        <ul className={styles.catalogGrid}>
          {visibleItems.map(({ blueprintUsageCount, segment }) => (
            <li key={segment.id}>
              <ObjectCard
                actions={
                  <div className={styles.cardActions}>
                    <Button
                      id={`navigation-origin-catalog-${segment.id}`}
                      onClick={() => onOpen(segment.id)}
                      size="small"
                    >
                      Open
                    </Button>
                    {onAdd === undefined ? null : (
                      <Button
                        onClick={() => onAdd(segment.id)}
                        size="small"
                        variant="ghost"
                      >
                        Add to Blueprint
                      </Button>
                    )}
                    <Menu
                      trigger={
                        <IconButton
                          icon="more"
                          label={`More actions for ${segment.name}`}
                          size="small"
                          tooltip="More actions"
                        />
                      }
                    >
                      <MenuItem onSelect={() => onOpen(segment.id)}>
                        Open
                      </MenuItem>
                      <MenuItem onSelect={() => onArchive(segment.id)}>
                        Archive
                      </MenuItem>
                    </Menu>
                  </div>
                }
                className={styles.catalogCard}
                description={segment.description ?? "Reusable Show Segment"}
                metadata={
                  <>
                    <span>
                      {blueprintUsageCount === 0
                        ? "Not used in Blueprint"
                        : `Used ${blueprintUsageCount} ${blueprintUsageCount === 1 ? "time" : "times"} in Blueprint`}
                    </span>
                    <span>
                      Edited {new Date(segment.updatedAt).toLocaleDateString()}
                    </span>
                  </>
                }
                onClick={() => setSelectedId(segment.id)}
                onDoubleClick={() => onOpen(segment.id)}
                preview={
                  <div className={styles.preview}>{segment.name.at(0)}</div>
                }
                selected={selectedId === segment.id}
                title={segment.name}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
