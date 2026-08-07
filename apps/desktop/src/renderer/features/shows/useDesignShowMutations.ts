import type { ShowDesignDto, ShowDesignResult } from "@showflow/contracts";
import type { SaveState } from "@showflow/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { showDesignQueryKey } from "./show-queries";

type HistoryCommand = () => Promise<HistoryCommand>;
type HistoryInstruction =
  | {
      readonly kind: "add";
      readonly position: number;
      readonly showSegmentId: string;
    }
  | {
      readonly kind: "remove";
      readonly placementId: string;
      readonly position: number;
      readonly showSegmentId: string;
    }
  | {
      readonly kind: "reorder";
      readonly inversePlacementIds: readonly string[];
      readonly orderedPlacementIds: readonly string[];
    };

export interface DesignShowMutations {
  readonly addExisting: (
    showSegmentId: string,
    position?: number,
  ) => Promise<void>;
  readonly archiveSegment: (showSegmentId: string) => Promise<void>;
  readonly createSegment: (input: {
    readonly description?: string;
    readonly name: string;
    readonly placeInBlueprint: boolean;
    readonly position?: number;
  }) => Promise<string | undefined>;
  readonly duplicatePlacement: (placementId: string) => Promise<void>;
  readonly error: string | undefined;
  readonly isSaving: boolean;
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly redo: () => Promise<void>;
  readonly removePlacement: (placementId: string) => Promise<void>;
  readonly reorder: (orderedPlacementIds: readonly string[]) => Promise<void>;
  readonly saveState: SaveState;
  readonly undo: () => Promise<void>;
}

export const useDesignShowMutations = (
  design: ShowDesignDto | undefined,
): DesignShowMutations => {
  const queryClient = useQueryClient();
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState<string>();
  const [historyVersion, setHistoryVersion] = useState(0);
  const undoStack = useRef<HistoryCommand[]>([]);
  const redoStack = useRef<HistoryCommand[]>([]);
  const ids = useMemo(
    () =>
      design === undefined
        ? undefined
        : {
            blueprintId: design.blueprint.id,
            showId: design.show.id,
            studioId: design.show.studioId,
          },
    [design],
  );

  const applyResult = useCallback(
    async (
      request: () => Promise<ShowDesignResult>,
    ): Promise<ShowDesignDto> => {
      setSaveState("saving");
      setError(undefined);
      let result: ShowDesignResult;
      try {
        result = await request();
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Showflow could not save the Blueprint change. Your saved Storyboard was not changed. Try again.";
        setSaveState("error");
        setError(message);
        throw requestError;
      }
      if (!result.ok) {
        setSaveState("error");
        setError(result.error.message);
        throw new Error(result.error.message);
      }
      queryClient.setQueryData(
        showDesignQueryKey(result.data.show.studioId, result.data.show.id),
        result.data,
      );
      setSaveState("saved");
      return result.data;
    },
    [queryClient],
  );

  const requireIds = useCallback(() => {
    if (ids === undefined) throw new Error("Design Show is not loaded.");
    return ids;
  }, [ids]);

  const makeHistoryCommand = useCallback(
    (initialInstruction: HistoryInstruction): HistoryCommand => {
      const build =
        (instruction: HistoryInstruction): HistoryCommand =>
        async () => {
          const scope = requireIds();
          if (instruction.kind === "add") {
            const beforeIds = new Set(
              (
                queryClient.getQueryData<ShowDesignDto>(
                  showDesignQueryKey(scope.studioId, scope.showId),
                )?.blueprint.placements ?? []
              ).map((placement) => placement.id),
            );
            const updated = await applyResult(() =>
              window.showflow.blueprints.addSegment({
                ...scope,
                showSegmentId: instruction.showSegmentId,
                position: instruction.position,
              }),
            );
            const added = updated.blueprint.placements.find(
              (placement) => !beforeIds.has(placement.id),
            );
            if (added === undefined) {
              throw new Error("Showflow could not identify the added Segment.");
            }
            return build({
              kind: "remove",
              placementId: added.id,
              position: instruction.position,
              showSegmentId: instruction.showSegmentId,
            });
          }
          if (instruction.kind === "remove") {
            await applyResult(() =>
              window.showflow.blueprints.removePlacement({
                ...scope,
                placementId: instruction.placementId,
              }),
            );
            return build({
              kind: "add",
              position: instruction.position,
              showSegmentId: instruction.showSegmentId,
            });
          }
          await applyResult(() =>
            window.showflow.blueprints.reorder({
              ...scope,
              orderedPlacementIds: [...instruction.orderedPlacementIds],
            }),
          );
          return build({
            kind: "reorder",
            inversePlacementIds: instruction.orderedPlacementIds,
            orderedPlacementIds: instruction.inversePlacementIds,
          });
        };
      return build(initialInstruction);
    },
    [applyResult, queryClient, requireIds],
  );

  const record = useCallback((command: HistoryCommand): void => {
    undoStack.current.push(command);
    redoStack.current = [];
    setHistoryVersion((version) => version + 1);
  }, []);

  const addExisting = useCallback(
    async (showSegmentId: string, suppliedPosition?: number): Promise<void> => {
      const scope = requireIds();
      const before = queryClient.getQueryData<ShowDesignDto>(
        showDesignQueryKey(scope.studioId, scope.showId),
      );
      const position =
        suppliedPosition ?? before?.blueprint.placements.length ?? 0;
      const beforeIds = new Set(
        before?.blueprint.placements.map((placement) => placement.id) ?? [],
      );
      const updated = await applyResult(() =>
        window.showflow.blueprints.addSegment({
          ...scope,
          showSegmentId,
          position,
        }),
      );
      const added = updated.blueprint.placements.find(
        (placement) => !beforeIds.has(placement.id),
      );
      if (added !== undefined) {
        record(
          makeHistoryCommand({
            kind: "remove",
            placementId: added.id,
            position,
            showSegmentId,
          }),
        );
      }
    },
    [applyResult, makeHistoryCommand, queryClient, record, requireIds],
  );

  const createSegment = useCallback(
    async (input: {
      readonly description?: string;
      readonly name: string;
      readonly placeInBlueprint: boolean;
      readonly position?: number;
    }): Promise<string | undefined> => {
      const scope = requireIds();
      const before = queryClient.getQueryData<ShowDesignDto>(
        showDesignQueryKey(scope.studioId, scope.showId),
      );
      const beforeSegmentIds = new Set(
        before?.segments.map(({ segment }) => segment.id) ?? [],
      );
      const beforePlacementIds = new Set(
        before?.blueprint.placements.map((placement) => placement.id) ?? [],
      );
      const position =
        input.position ?? before?.blueprint.placements.length ?? 0;
      const updated = await applyResult(() =>
        window.showflow.segments.create({
          showId: scope.showId,
          studioId: scope.studioId,
          name: input.name,
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
          ...(input.placeInBlueprint
            ? { blueprintId: scope.blueprintId, position }
            : {}),
        }),
      );
      const created = updated.segments.find(
        ({ segment }) => !beforeSegmentIds.has(segment.id),
      )?.segment;
      if (input.placeInBlueprint && created !== undefined) {
        const placement = updated.blueprint.placements.find(
          (candidate) => !beforePlacementIds.has(candidate.id),
        );
        if (placement !== undefined) {
          record(
            makeHistoryCommand({
              kind: "remove",
              placementId: placement.id,
              position,
              showSegmentId: created.id,
            }),
          );
        }
      }
      return created?.id;
    },
    [applyResult, makeHistoryCommand, queryClient, record, requireIds],
  );

  const archiveSegment = useCallback(
    async (showSegmentId: string): Promise<void> => {
      const scope = requireIds();
      await applyResult(() =>
        window.showflow.segments.archive({
          showId: scope.showId,
          showSegmentId,
          studioId: scope.studioId,
        }),
      );
    },
    [applyResult, requireIds],
  );

  const duplicatePlacement = useCallback(
    async (placementId: string): Promise<void> => {
      const scope = requireIds();
      const before = queryClient.getQueryData<ShowDesignDto>(
        showDesignQueryKey(scope.studioId, scope.showId),
      );
      const source = before?.blueprint.placements.find(
        (placement) => placement.id === placementId,
      );
      const beforeIds = new Set(
        before?.blueprint.placements.map((placement) => placement.id) ?? [],
      );
      const updated = await applyResult(() =>
        window.showflow.blueprints.duplicatePlacement({
          ...scope,
          placementId,
        }),
      );
      const duplicate = updated.blueprint.placements.find(
        (placement) => !beforeIds.has(placement.id),
      );
      if (source !== undefined && duplicate !== undefined) {
        record(
          makeHistoryCommand({
            kind: "remove",
            placementId: duplicate.id,
            position: source.position + 1,
            showSegmentId: source.showSegmentId,
          }),
        );
      }
    },
    [applyResult, makeHistoryCommand, queryClient, record, requireIds],
  );

  const removePlacement = useCallback(
    async (placementId: string): Promise<void> => {
      const scope = requireIds();
      const before = queryClient.getQueryData<ShowDesignDto>(
        showDesignQueryKey(scope.studioId, scope.showId),
      );
      const placement = before?.blueprint.placements.find(
        (candidate) => candidate.id === placementId,
      );
      await applyResult(() =>
        window.showflow.blueprints.removePlacement({ ...scope, placementId }),
      );
      if (placement !== undefined) {
        record(
          makeHistoryCommand({
            kind: "add",
            position: placement.position,
            showSegmentId: placement.showSegmentId,
          }),
        );
      }
    },
    [applyResult, makeHistoryCommand, queryClient, record, requireIds],
  );

  const reorder = useCallback(
    async (orderedPlacementIds: readonly string[]): Promise<void> => {
      const scope = requireIds();
      const previous =
        queryClient
          .getQueryData<ShowDesignDto>(
            showDesignQueryKey(scope.studioId, scope.showId),
          )
          ?.blueprint.placements.map((placement) => placement.id) ?? [];
      if (previous.every((id, index) => id === orderedPlacementIds[index]))
        return;
      await applyResult(() =>
        window.showflow.blueprints.reorder({
          ...scope,
          orderedPlacementIds: [...orderedPlacementIds],
        }),
      );
      record(
        makeHistoryCommand({
          kind: "reorder",
          inversePlacementIds: orderedPlacementIds,
          orderedPlacementIds: previous,
        }),
      );
    },
    [applyResult, makeHistoryCommand, queryClient, record, requireIds],
  );

  const runHistory = useCallback(
    async (
      from: MutableRefObject<HistoryCommand[]>,
      to: MutableRefObject<HistoryCommand[]>,
    ): Promise<void> => {
      const command = from.current.pop();
      if (command === undefined) return;
      setHistoryVersion((version) => version + 1);
      try {
        const inverse = await command();
        to.current.push(inverse);
      } catch {
        from.current.push(command);
      } finally {
        setHistoryVersion((version) => version + 1);
      }
    },
    [],
  );

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;
  void historyVersion;

  return {
    addExisting,
    archiveSegment,
    createSegment,
    duplicatePlacement,
    error,
    isSaving: saveState === "saving",
    canRedo,
    canUndo,
    redo: () => runHistory(redoStack, undoStack),
    removePlacement,
    reorder,
    saveState,
    undo: () => runHistory(undoStack, redoStack),
  };
};
