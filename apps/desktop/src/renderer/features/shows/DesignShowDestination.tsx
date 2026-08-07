import {
  ApplicationShell,
  Badge,
  Button,
  EmptyState,
  IconButton,
  SaveStateIndicator,
  ScopeLabel,
  Skeleton,
  Tabs,
} from "@showflow/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  getDesignShowRoute,
  getDesignShowSegmentRoute,
  getStudioHomeRoute,
} from "../../app-routes.mts";
import { usePersistedNavigation } from "../navigation/usePersistedNavigation";
import { StudioSwitcher } from "../studios/StudioSwitcher";
import { loadStudio, studioQueryKey } from "../studios/studio-queries";
import { BlueprintStoryboard } from "./BlueprintStoryboard";
import { SegmentCatalog } from "./SegmentCatalog";
import { SegmentPicker } from "./SegmentPicker";
import styles from "./design-show.module.css";
import { loadShowDesign, showDesignQueryKey } from "./show-queries";
import { useDesignShowMutations } from "./useDesignShowMutations";

type DesignTab = "blueprint" | "segments" | "layouts";

export const DesignShowDestination = () => {
  const navigate = useNavigate();
  const { studioId, showId, segmentId } = useParams<{
    studioId: string;
    showId: string;
    segmentId: string;
  }>();
  const [selectionError, setSelectionError] = useState<string>();
  const [activeTab, setActiveTab] = useState<DesignTab>(
    segmentId === undefined ? "blueprint" : "segments",
  );
  const [pickerMode, setPickerMode] = useState<"blueprint" | "catalog">(
    "blueprint",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const routeIsComplete = studioId !== undefined && showId !== undefined;
  const studioQuery = useQuery({
    enabled: studioId !== undefined,
    queryFn: () => loadStudio(studioId ?? ""),
    queryKey: studioQueryKey(studioId ?? "incomplete"),
    retry: false,
  });
  const designQuery = useQuery({
    enabled: routeIsComplete,
    queryFn: () => loadShowDesign(studioId ?? "", showId ?? ""),
    queryKey: showDesignQueryKey(
      studioId ?? "incomplete",
      showId ?? "incomplete",
    ),
    retry: false,
  });
  const studio = studioQuery.data;
  const design = designQuery.data;
  const mutations = useDesignShowMutations(design);
  const selectedSegment = design?.segments.find(
    ({ segment }) => segment.id === segmentId,
  )?.segment;
  const route =
    design === undefined
      ? undefined
      : segmentId === undefined
        ? getDesignShowRoute(design.show.studioId, design.show.id)
        : getDesignShowSegmentRoute(
            design.show.studioId,
            design.show.id,
            segmentId,
          );
  const navigationError = usePersistedNavigation({
    route,
    studioId: design?.show.studioId,
  });
  const isPending = studioQuery.isPending || designQuery.isPending;
  const isError =
    !routeIsComplete || studioQuery.isError || designQuery.isError;

  const openSegment = (targetSegmentId: string): void => {
    if (design === undefined) return;
    navigate(
      getDesignShowSegmentRoute(
        design.show.studioId,
        design.show.id,
        targetSegmentId,
      ),
    );
  };
  const returnToBlueprint = (): void => {
    if (design === undefined) return;
    setActiveTab("blueprint");
    navigate(getDesignShowRoute(design.show.studioId, design.show.id));
  };
  const run = (operation: Promise<unknown>): void => {
    void operation.catch(() => undefined);
  };
  const openPicker = (mode: "blueprint" | "catalog"): void => {
    setPickerMode(mode);
    setPickerOpen(true);
  };

  return (
    <ApplicationShell
      breadcrumb={<span>{design?.show.name ?? "Show"} / Design Show</span>}
      historyActions={
        <>
          <IconButton
            disabled={!mutations.canUndo || mutations.isSaving}
            icon="undo"
            label="Undo Blueprint change"
            onClick={() => run(mutations.undo())}
            tooltip="Undo"
          />
          <IconButton
            disabled={!mutations.canRedo || mutations.isSaving}
            icon="redo"
            label="Redo Blueprint change"
            onClick={() => run(mutations.redo())}
            tooltip="Redo"
          />
        </>
      }
      primaryAction={
        <Button
          disabled={design === undefined || mutations.isSaving}
          leadingIcon="plus"
          onClick={() => openPicker("blueprint")}
          variant="primary"
        >
          Add Segment
        </Button>
      }
      saveState={<SaveStateIndicator state={mutations.saveState} />}
      scope={<ScopeLabel scope="show" />}
      studioSwitcher={
        studio === undefined ? (
          <Button disabled size="small" variant="ghost">
            Studio
          </Button>
        ) : (
          <StudioSwitcher
            currentStudio={studio}
            onSelectionError={setSelectionError}
          />
        )
      }
      title={design?.show.name ?? "Design Show"}
    >
      <div className={styles.workspace}>
        {(selectionError ?? navigationError ?? mutations.error) ? (
          <p className={styles.error} role="alert">
            {selectionError ?? navigationError ?? mutations.error}
          </p>
        ) : null}
        {isPending ? (
          <section aria-label="Loading Design Show">
            <Skeleton label="Loading Show Blueprint" />
          </section>
        ) : isError ? (
          <section className={styles.placeholder}>
            <p className={styles.eyebrow}>Show unavailable</p>
            <h2 className={styles.placeholderTitle}>
              Showflow could not open Design Show
            </h2>
            <p className={styles.error} role="alert">
              {designQuery.error instanceof Error
                ? designQuery.error.message
                : "Return to Studio Home and choose an available Show."}
            </p>
            {studioId === undefined ? null : (
              <Button onClick={() => navigate(getStudioHomeRoute(studioId))}>
                Return to Studio Home
              </Button>
            )}
          </section>
        ) : design === undefined ? null : (
          <>
            <header className={styles.header}>
              <div className={styles.intro}>
                <p className={styles.eyebrow}>Design Show</p>
                <h2 className={styles.heading}>Show Blueprint</h2>
                <p className={styles.description}>
                  Changes become the default for future Episodes.
                </p>
              </div>
              <Badge tone="info">
                {design.blueprint.placementCount} Segment
                {design.blueprint.placementCount === 1 ? "" : "s"}
              </Badge>
            </header>

            <Tabs
              items={[
                {
                  content: (
                    <div className={styles.tabContent}>
                      <div className={styles.toolbar}>
                        <p className={styles.metadata}>
                          Arrange the default Storyboard from left to right.
                        </p>
                        <Button
                          leadingIcon="plus"
                          onClick={() => openPicker("blueprint")}
                        >
                          Add Segment
                        </Button>
                      </div>
                      <BlueprintStoryboard
                        onAddFirst={() => openPicker("blueprint")}
                        onDuplicate={(placementId) =>
                          run(mutations.duplicatePlacement(placementId))
                        }
                        onOpen={openSegment}
                        onRemove={(placementId) =>
                          run(mutations.removePlacement(placementId))
                        }
                        onReorder={(placementIds) =>
                          mutations.reorder(placementIds)
                        }
                        placements={design.blueprint.placements}
                        segments={design.segments}
                      />
                    </div>
                  ),
                  label: "Blueprint",
                  value: "blueprint",
                },
                {
                  content: (
                    <div className={styles.tabContent}>
                      {segmentId === undefined ? (
                        <SegmentCatalog
                          items={design.segments}
                          onAdd={(targetSegmentId) =>
                            run(mutations.addExisting(targetSegmentId))
                          }
                          onArchive={(targetSegmentId) =>
                            run(mutations.archiveSegment(targetSegmentId))
                          }
                          onCreate={() => openPicker("catalog")}
                          onOpen={openSegment}
                        />
                      ) : selectedSegment === undefined ? (
                        <EmptyState
                          action={
                            <Button onClick={returnToBlueprint}>
                              Return to Blueprint
                            </Button>
                          }
                          description="This Segment may have been archived or removed."
                          heading="Segment unavailable"
                        />
                      ) : (
                        <section className={styles.placeholder}>
                          <p className={styles.eyebrow}>Show Segment</p>
                          <h2 className={styles.placeholderTitle}>
                            {selectedSegment.name}
                          </h2>
                          <p className={styles.placeholderCopy}>
                            {selectedSegment.description ??
                              "Detailed Segment fields, lifecycle, Layouts, and notes arrive in Sprint 7."}
                          </p>
                          <p className={styles.description}>
                            Changes affect future uses of this Segment.
                          </p>
                          <div className={styles.placeholderActions}>
                            <Button onClick={returnToBlueprint}>
                              Return to Blueprint
                            </Button>
                            <Button disabled variant="ghost">
                              Edit Segment details in Sprint 7
                            </Button>
                          </div>
                        </section>
                      )}
                    </div>
                  ),
                  label: "Segments",
                  value: "segments",
                },
                {
                  content: (
                    <div className={styles.tabContent}>
                      <div className={styles.emptyWrap}>
                        <EmptyState
                          action={<Button disabled>New Layout</Button>}
                          description="Reusable Layout composition arrives in Sprint 10."
                          heading="Layout Catalog"
                        />
                      </div>
                    </div>
                  ),
                  label: "Layouts",
                  value: "layouts",
                },
              ]}
              label="Design Show sections"
              onValueChange={(value) => {
                const nextTab = value as DesignTab;
                setActiveTab(nextTab);
                if (segmentId !== undefined && nextTab !== "segments") {
                  navigate(
                    getDesignShowRoute(design.show.studioId, design.show.id),
                  );
                }
              }}
              value={segmentId === undefined ? activeTab : "segments"}
            />
          </>
        )}
      </div>

      {design === undefined ? null : (
        <SegmentPicker
          isSaving={mutations.isSaving}
          mode={pickerMode}
          onAdd={async (targetSegmentId) => {
            await mutations.addExisting(targetSegmentId);
          }}
          onCreate={async (input) => {
            const createdId = await mutations.createSegment({
              ...input,
              placeInBlueprint: pickerMode === "blueprint",
            });
            if (createdId !== undefined) openSegment(createdId);
          }}
          onOpenChange={setPickerOpen}
          open={pickerOpen}
          segments={design.segments}
        />
      )}
    </ApplicationShell>
  );
};
