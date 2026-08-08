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
import { Navigate, useNavigate, useParams } from "react-router-dom";

import {
  getDesignShowRoute,
  getDesignShowSectionRoute,
  getDesignShowSegmentRoute,
  getShowDetailRoute,
  getStudioHomeRoute,
  isDesignShowSection,
} from "../../app-routes.mts";
import { ParentNavigation } from "../navigation/ParentNavigation";
import { usePersistedNavigation } from "../navigation/usePersistedNavigation";
import { StudioSwitcher } from "../studios/StudioSwitcher";
import { loadStudio, studioQueryKey } from "../studios/studio-queries";
import { BlueprintStoryboard } from "./BlueprintStoryboard";
import { SegmentCatalog } from "./SegmentCatalog";
import { SegmentPicker } from "./SegmentPicker";
import styles from "./design-show.module.css";
import { loadShowDesign, showDesignQueryKey } from "./show-queries";
import { useDesignShowMutations } from "./useDesignShowMutations";

export const DesignShowDestination = () => {
  const navigate = useNavigate();
  const { designSection, studioId, showId } = useParams<{
    designSection: string;
    studioId: string;
    showId: string;
  }>();
  const [selectionError, setSelectionError] = useState<string>();
  const activeTab = isDesignShowSection(designSection)
    ? designSection
    : "blueprint";
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
  const route =
    design === undefined
      ? undefined
      : getDesignShowSectionRoute(
          design.show.studioId,
          design.show.id,
          activeTab,
        );
  const navigationError = usePersistedNavigation({
    route,
    studioId: design?.show.studioId,
  });
  const isPending = studioQuery.isPending || designQuery.isPending;
  const isError =
    !routeIsComplete || studioQuery.isError || designQuery.isError;

  const openSegment = (
    targetSegmentId: string,
    focusId = `navigation-origin-catalog-${targetSegmentId}`,
  ): void => {
    if (design === undefined) return;
    navigate(
      getDesignShowSegmentRoute(
        design.show.studioId,
        design.show.id,
        targetSegmentId,
      ),
      {
        state: {
          navigationOrigin: {
            focusId,
            label: activeTab === "blueprint" ? "Blueprint" : "Segments",
            returnTo: getDesignShowSectionRoute(
              design.show.studioId,
              design.show.id,
              activeTab,
            ),
          },
        },
      },
    );
  };
  const run = (operation: Promise<unknown>): void => {
    void operation.catch(() => undefined);
  };
  const openPicker = (mode: "blueprint" | "catalog"): void => {
    setPickerMode(mode);
    setPickerOpen(true);
  };

  if (
    studioId !== undefined &&
    showId !== undefined &&
    !isDesignShowSection(designSection)
  ) {
    return <Navigate replace to={getDesignShowRoute(studioId, showId)} />;
  }

  return (
    <ApplicationShell
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
        activeTab === "layouts" ? undefined : (
          <Button
            disabled={design === undefined || mutations.isSaving}
            leadingIcon="plus"
            onClick={() =>
              openPicker(activeTab === "blueprint" ? "blueprint" : "catalog")
            }
            variant="primary"
          >
            {activeTab === "blueprint" ? "Add Segment" : "New Segment"}
          </Button>
        )
      }
      parentNavigation={
        studioId === undefined || showId === undefined ? undefined : (
          <ParentNavigation
            accessibleLabel="Back to Show overview"
            label="Show overview"
            to={getShowDetailRoute(studioId, showId)}
          />
        )
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
      title="Design Show"
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
                      </div>
                      <BlueprintStoryboard
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
                      <SegmentCatalog
                        items={design.segments}
                        onAdd={(targetSegmentId) =>
                          run(mutations.addExisting(targetSegmentId))
                        }
                        onArchive={(targetSegmentId) =>
                          run(mutations.archiveSegment(targetSegmentId))
                        }
                        onOpen={openSegment}
                      />
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
                          action={null}
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
                if (!isDesignShowSection(value)) return;
                navigate(
                  getDesignShowSectionRoute(
                    design.show.studioId,
                    design.show.id,
                    value,
                  ),
                );
              }}
              value={activeTab}
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
