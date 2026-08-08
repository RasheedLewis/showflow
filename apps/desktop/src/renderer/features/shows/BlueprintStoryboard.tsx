import type {
  BlueprintPlacementDto,
  SegmentCatalogItemDto,
} from "@showflow/contracts";
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
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

import styles from "./design-show.module.css";

interface PendingOrder {
  readonly orderIds: readonly string[];
  readonly placementsSnapshot: readonly BlueprintPlacementDto[];
}

interface SortablePlacementProps {
  readonly index: number;
  readonly placement: BlueprintPlacementDto;
  readonly reuseCount: number;
  readonly segment: SegmentCatalogItemDto["segment"] | undefined;
  readonly selected: boolean;
  readonly total: number;
  readonly onDuplicate: () => void;
  readonly onMove: (destination: number) => void;
  readonly onOpen: (focusId: string) => void;
  readonly onRemove: () => void;
  readonly onSelect: () => void;
}

const SortablePlacement = ({
  index,
  onDuplicate,
  onMove,
  onOpen,
  onRemove,
  onSelect,
  placement,
  reuseCount,
  segment,
  selected,
  total,
}: SortablePlacementProps) => {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: placement.id });
  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const title = segment?.name ?? "Archived Segment";
  const effectiveDurationMs =
    placement.defaultDurationMs ?? segment?.expectedDurationMs ?? null;

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
              aria-label={`Reorder ${title}`}
              className={styles.dragHandle}
              size="small"
              variant="ghost"
              {...attributes}
              {...listeners}
            >
              Reorder
            </Button>
            <Button
              id={`navigation-origin-blueprint-${placement.id}`}
              onClick={() =>
                onOpen(`navigation-origin-blueprint-${placement.id}`)
              }
              size="small"
            >
              Open
            </Button>
            <Menu
              trigger={
                <IconButton
                  icon="more"
                  label={`More actions for ${title}`}
                  size="small"
                  tooltip="More actions"
                />
              }
            >
              <MenuItem
                onSelect={() =>
                  onOpen(`navigation-origin-blueprint-${placement.id}`)
                }
              >
                Open Segment
              </MenuItem>
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
              <MenuItem onSelect={onDuplicate}>Duplicate placement</MenuItem>
              <MenuSeparator />
              <MenuItem destructive onSelect={onRemove}>
                Remove from Blueprint
              </MenuItem>
            </Menu>
          </div>
        }
        className={styles.sortableCard}
        dragging={isDragging}
        duration={
          effectiveDurationMs === null
            ? "Duration not set"
            : `${Math.round(effectiveDurationMs / 1_000)} sec`
        }
        onClick={onSelect}
        onDoubleClick={() =>
          onOpen(`navigation-origin-blueprint-${placement.id}`)
        }
        {...(placement.label === null
          ? {}
          : { placementLabel: placement.label })}
        preview={<div className={styles.preview}>{title.at(0)}</div>}
        readiness={segment?.archivedAt ? "blocking-issue" : "needs-content"}
        reuseCount={reuseCount}
        selected={selected}
        sequenceNumber={index + 1}
        summary={
          segment?.archivedAt
            ? "This referenced Segment is archived."
            : "Validation arrives with Segment content."
        }
        title={title}
      />
    </li>
  );
};

export interface BlueprintStoryboardProps {
  readonly onDuplicate: (placementId: string) => void;
  readonly onOpen: (showSegmentId: string, focusId: string) => void;
  readonly onRemove: (placementId: string) => void;
  readonly onReorder: (orderedPlacementIds: readonly string[]) => Promise<void>;
  readonly placements: readonly BlueprintPlacementDto[];
  readonly segments: readonly SegmentCatalogItemDto[];
}

export const BlueprintStoryboard = ({
  onDuplicate,
  onOpen,
  onRemove,
  onReorder,
  placements,
  segments,
}: BlueprintStoryboardProps) => {
  const [selectedId, setSelectedId] = useState<string>();
  const [pendingOrder, setPendingOrder] = useState<PendingOrder>();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const savedPlacements = useMemo(
    () => [...placements].sort((left, right) => left.position - right.position),
    [placements],
  );
  const pendingOrderIds =
    pendingOrder?.placementsSnapshot === placements
      ? pendingOrder.orderIds
      : undefined;
  const orderedPlacements = useMemo(() => {
    if (pendingOrderIds === undefined) return savedPlacements;
    const placementsById = new Map(
      savedPlacements.map((placement) => [placement.id, placement]),
    );
    const pendingPlacements = pendingOrderIds.flatMap((id) => {
      const placement = placementsById.get(id);
      return placement === undefined ? [] : [placement];
    });
    return pendingPlacements.length === savedPlacements.length
      ? pendingPlacements
      : savedPlacements;
  }, [pendingOrderIds, savedPlacements]);
  const segmentsById = useMemo(
    () => new Map(segments.map(({ segment }) => [segment.id, segment])),
    [segments],
  );
  const reuseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const placement of orderedPlacements) {
      counts.set(
        placement.showSegmentId,
        (counts.get(placement.showSegmentId) ?? 0) + 1,
      );
    }
    return counts;
  }, [orderedPlacements]);

  const move = (source: number, destination: number): void => {
    if (pendingOrderIds !== undefined) return;
    const nextOrderIds = arrayMove(orderedPlacements, source, destination).map(
      (placement) => placement.id,
    );
    setPendingOrder({ orderIds: nextOrderIds, placementsSnapshot: placements });
    void onReorder(nextOrderIds).catch(() => {
      setPendingOrder((current) =>
        current?.orderIds === nextOrderIds ? undefined : current,
      );
    });
  };
  const handleDragEnd = (event: DragEndEvent): void => {
    if (event.over === null || event.active.id === event.over.id) return;
    const source = orderedPlacements.findIndex(
      (placement) => placement.id === event.active.id,
    );
    const destination = orderedPlacements.findIndex(
      (placement) => placement.id === event.over?.id,
    );
    if (source >= 0 && destination >= 0) move(source, destination);
  };

  if (orderedPlacements.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <EmptyState
          action={null}
          description="Add reusable Segments in the order they usually occur. Every new Episode will begin here."
          heading="Design your Show’s default Storyboard"
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
        items={orderedPlacements.map((placement) => placement.id)}
        strategy={rectSortingStrategy}
      >
        <ol
          aria-label="Show Blueprint Storyboard"
          className={styles.storyboard}
        >
          {orderedPlacements.map((placement, index) => (
            <SortablePlacement
              index={index}
              key={placement.id}
              onDuplicate={() => onDuplicate(placement.id)}
              onMove={(destination) => move(index, destination)}
              onOpen={(focusId) => onOpen(placement.showSegmentId, focusId)}
              onRemove={() => onRemove(placement.id)}
              onSelect={() => setSelectedId(placement.id)}
              placement={placement}
              reuseCount={reuseCounts.get(placement.showSegmentId) ?? 1}
              segment={segmentsById.get(placement.showSegmentId)}
              selected={selectedId === placement.id}
              total={orderedPlacements.length}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
};
