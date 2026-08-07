import type { EpisodeStoryboardDto } from "@showflow/contracts";
import {
  Button,
  EmptyState,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  StoryboardCard,
} from "@showflow/ui";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState, type CSSProperties } from "react";

import styles from "./episodes.module.css";

const formatDuration = (durationMs: number | null): string => {
  if (durationMs === null) return "Duration not set";
  const totalSeconds = Math.floor(durationMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

interface SortableItemProps {
  readonly index: number;
  readonly item: EpisodeStoryboardDto["items"][number];
  readonly onDuplicate: () => void;
  readonly onMove: (destination: number) => void;
  readonly onOpen: () => void;
  readonly onRemove: () => void;
  readonly onSelect: () => void;
  readonly selected: boolean;
  readonly total: number;
}

const SortableItem = ({
  index,
  item,
  onDuplicate,
  onMove,
  onOpen,
  onRemove,
  onSelect,
  selected,
  total,
}: SortableItemProps) => {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.episodeSegment.id });
  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      className={styles.storyboardItem}
      ref={setNodeRef}
      style={sortableStyle}
    >
      <StoryboardCard
        actions={
          <div className={styles.cardActions}>
            <Button
              aria-label={`Open ${item.sourceSegment.name}`}
              onClick={onOpen}
              size="small"
              variant="ghost"
            >
              Open
            </Button>
            <Button
              aria-label={`Reorder ${item.sourceSegment.name}`}
              className={styles.dragHandle}
              size="small"
              variant="ghost"
              {...attributes}
              {...listeners}
            >
              Reorder
            </Button>
            <Menu
              trigger={
                <IconButton
                  icon="more"
                  label={`More actions for ${item.sourceSegment.name}`}
                  size="small"
                  tooltip="More actions"
                />
              }
            >
              <MenuItem
                disabled={index === 0}
                onSelect={() => onMove(index - 1)}
              >
                Move earlier
              </MenuItem>
              <MenuItem
                disabled={index === total - 1}
                onSelect={() => onMove(index + 1)}
              >
                Move later
              </MenuItem>
              <MenuItem onSelect={onDuplicate}>Duplicate Segment</MenuItem>
              <MenuSeparator />
              <MenuItem destructive onSelect={onRemove}>
                Remove from Episode
              </MenuItem>
            </Menu>
          </div>
        }
        actionsVisible
        className={styles.sortableCard}
        dragging={isDragging}
        duration={formatDuration(item.expectedDurationMs)}
        issueCount={item.validationIssueCount}
        onClick={onSelect}
        {...(item.episodeSegment.label === null
          ? {}
          : { placementLabel: item.episodeSegment.label })}
        preview={
          <div className={styles.preview}>
            {item.sourceSegment.name.at(0)?.toUpperCase()}
          </div>
        }
        readiness={item.readiness}
        selected={selected}
        sequenceNumber={index + 1}
        {...(item.summary === null ? {} : { summary: item.summary })}
        title={item.sourceSegment.name}
      />
    </li>
  );
};

export interface EpisodeStoryboardProps {
  readonly items: EpisodeStoryboardDto["items"];
  readonly onAddFirst: () => void;
  readonly onDuplicate: (episodeSegmentId: string) => void;
  readonly onOpen: (episodeSegmentId: string) => void;
  readonly onRemove: (episodeSegmentId: string) => void;
  readonly onReorder: (
    orderedEpisodeSegmentIds: readonly string[],
  ) => Promise<void>;
}

export const EpisodeStoryboard = ({
  items,
  onAddFirst,
  onDuplicate,
  onOpen,
  onRemove,
  onReorder,
}: EpisodeStoryboardProps) => {
  const [selectedId, setSelectedId] = useState<string>();
  const [pendingOrderIds, setPendingOrderIds] = useState<readonly string[]>();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const savedItems = useMemo(
    () =>
      [...items].sort(
        (left, right) =>
          left.episodeSegment.position - right.episodeSegment.position,
      ),
    [items],
  );
  const orderedItems = useMemo(() => {
    if (pendingOrderIds === undefined) return savedItems;
    const byId = new Map(
      savedItems.map((item) => [item.episodeSegment.id, item]),
    );
    const pending = pendingOrderIds.flatMap((id) => {
      const item = byId.get(id);
      return item === undefined ? [] : [item];
    });
    return pending.length === savedItems.length ? pending : savedItems;
  }, [pendingOrderIds, savedItems]);

  const move = (source: number, destination: number): void => {
    if (pendingOrderIds !== undefined) return;
    const next = arrayMove(orderedItems, source, destination).map(
      ({ episodeSegment }) => episodeSegment.id,
    );
    setPendingOrderIds(next);
    void onReorder(next)
      .then(() => setPendingOrderIds(undefined))
      .catch(() => setPendingOrderIds(undefined));
  };
  const handleDragEnd = (event: DragEndEvent): void => {
    if (event.over === null || event.active.id === event.over.id) return;
    const source = orderedItems.findIndex(
      ({ episodeSegment }) => episodeSegment.id === event.active.id,
    );
    const destination = orderedItems.findIndex(
      ({ episodeSegment }) => episodeSegment.id === event.over?.id,
    );
    if (source >= 0 && destination >= 0) move(source, destination);
  };

  if (orderedItems.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <EmptyState
          action={
            <Button leadingIcon="plus" onClick={onAddFirst} variant="primary">
              Add Segment
            </Button>
          }
          description="Add Segments from the Show Catalog. New Segments you create will be reusable in future Episodes."
          heading="Build this Episode’s Storyboard"
          icon="plus"
        />
      </div>
    );
  }

  return (
    <DndContext
      autoScroll
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext
        items={orderedItems.map(({ episodeSegment }) => episodeSegment.id)}
        strategy={rectSortingStrategy}
      >
        <ol aria-label="Episode Storyboard" className={styles.storyboard}>
          {orderedItems.map((item, index) => (
            <SortableItem
              index={index}
              item={item}
              key={item.episodeSegment.id}
              onDuplicate={() => onDuplicate(item.episodeSegment.id)}
              onMove={(destination) => move(index, destination)}
              onOpen={() => onOpen(item.episodeSegment.id)}
              onRemove={() => onRemove(item.episodeSegment.id)}
              onSelect={() => setSelectedId(item.episodeSegment.id)}
              selected={selectedId === item.episodeSegment.id}
              total={orderedItems.length}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
};
