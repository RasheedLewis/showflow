import type {
  EpisodeSegmentDto,
  EpisodeStoryboardDto,
  EpisodeStoryboardResult,
} from "@showflow/contracts";
import type { SaveState } from "@showflow/ui";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import { showDesignQueryKey } from "../shows/show-queries";
import { episodeListQueryKey, episodeQueryKey } from "./episode-queries";

type HistoryCommand = () => Promise<HistoryCommand>;
type HistoryInstruction =
  | { readonly kind: "remove"; readonly segment: EpisodeSegmentDto }
  | { readonly kind: "restore"; readonly segment: EpisodeSegmentDto }
  | {
      readonly kind: "insert";
      readonly position: number;
      readonly showSegmentId: string;
    }
  | {
      readonly inverseIds: readonly string[];
      readonly kind: "reorder";
      readonly orderedIds: readonly string[];
    };

export const useEpisodeMutations = (
  storyboard: EpisodeStoryboardDto | undefined,
) => {
  const queryClient = useQueryClient();
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState<string>();
  const [historyVersion, setHistoryVersion] = useState(0);
  const undoStack = useRef<HistoryCommand[]>([]);
  const redoStack = useRef<HistoryCommand[]>([]);
  const scope = useMemo(
    () =>
      storyboard === undefined
        ? undefined
        : {
            episodeId: storyboard.episode.id,
            showId: storyboard.show.id,
            studioId: storyboard.show.studioId,
          },
    [storyboard],
  );
  const requireScope = useCallback(() => {
    if (scope === undefined) throw new Error("Produce Episode is not loaded.");
    return scope;
  }, [scope]);
  const applyResult = useCallback(
    async (
      request: () => Promise<EpisodeStoryboardResult>,
    ): Promise<EpisodeStoryboardDto> => {
      setSaveState("saving");
      setError(undefined);
      try {
        const result = await request();
        if (!result.ok) throw new Error(result.error.message);
        queryClient.setQueryData(
          episodeQueryKey(
            result.data.show.studioId,
            result.data.show.id,
            result.data.episode.id,
          ),
          result.data,
        );
        void queryClient.invalidateQueries({
          queryKey: episodeListQueryKey(
            result.data.show.studioId,
            result.data.show.id,
          ),
        });
        setSaveState("saved");
        return result.data;
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Showflow could not save the Episode change.";
        setError(message);
        setSaveState("error");
        throw requestError;
      }
    },
    [queryClient],
  );
  const currentStoryboard = useCallback(() => {
    const ids = requireScope();
    return queryClient.getQueryData<EpisodeStoryboardDto>(
      episodeQueryKey(ids.studioId, ids.showId, ids.episodeId),
    );
  }, [queryClient, requireScope]);
  const makeHistoryCommand = useCallback(
    (initial: HistoryInstruction): HistoryCommand => {
      const build =
        (instruction: HistoryInstruction): HistoryCommand =>
        async () => {
          const ids = requireScope();
          if (instruction.kind === "remove") {
            await applyResult(() =>
              window.showflow.episodes.removeSegment({
                ...ids,
                episodeSegmentId: instruction.segment.id,
              }),
            );
            return build({ kind: "restore", segment: instruction.segment });
          }
          if (instruction.kind === "restore") {
            await applyResult(() =>
              window.showflow.episodes.restoreSegment({
                ...ids,
                segment: instruction.segment,
              }),
            );
            return build({ kind: "remove", segment: instruction.segment });
          }
          if (instruction.kind === "insert") {
            const beforeIds = new Set(
              currentStoryboard()?.items.map(
                ({ episodeSegment }) => episodeSegment.id,
              ) ?? [],
            );
            const updated = await applyResult(() =>
              window.showflow.episodes.insertSegment({
                ...ids,
                position: instruction.position,
                showSegmentId: instruction.showSegmentId,
              }),
            );
            const added = updated.items.find(
              ({ episodeSegment }) => !beforeIds.has(episodeSegment.id),
            )?.episodeSegment;
            if (added === undefined) {
              throw new Error("Showflow could not identify the added Segment.");
            }
            return build({ kind: "remove", segment: added });
          }
          await applyResult(() =>
            window.showflow.episodes.reorder({
              ...ids,
              orderedEpisodeSegmentIds: [...instruction.orderedIds],
            }),
          );
          return build({
            inverseIds: instruction.orderedIds,
            kind: "reorder",
            orderedIds: instruction.inverseIds,
          });
        };
      return build(initial);
    },
    [applyResult, currentStoryboard, requireScope],
  );
  const record = useCallback((command: HistoryCommand): void => {
    undoStack.current.push(command);
    redoStack.current = [];
    setHistoryVersion((version) => version + 1);
  }, []);

  const addExisting = useCallback(
    async (showSegmentId: string, suppliedPosition?: number): Promise<void> => {
      const ids = requireScope();
      const before = currentStoryboard();
      const beforeIds = new Set(
        before?.items.map(({ episodeSegment }) => episodeSegment.id) ?? [],
      );
      const position = suppliedPosition ?? before?.items.length ?? 0;
      const updated = await applyResult(() =>
        window.showflow.episodes.insertSegment({
          ...ids,
          position,
          showSegmentId,
        }),
      );
      const added = updated.items.find(
        ({ episodeSegment }) => !beforeIds.has(episodeSegment.id),
      )?.episodeSegment;
      if (added !== undefined) {
        record(makeHistoryCommand({ kind: "remove", segment: added }));
      }
    },
    [applyResult, currentStoryboard, makeHistoryCommand, record, requireScope],
  );
  const createSegment = useCallback(
    async (input: {
      readonly description?: string;
      readonly name: string;
    }): Promise<void> => {
      const ids = requireScope();
      const before = currentStoryboard();
      const beforeIds = new Set(
        before?.items.map(({ episodeSegment }) => episodeSegment.id) ?? [],
      );
      const updated = await applyResult(() =>
        window.showflow.episodes.createSegment({
          ...ids,
          name: input.name,
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
        }),
      );
      const added = updated.items.find(
        ({ episodeSegment }) => !beforeIds.has(episodeSegment.id),
      )?.episodeSegment;
      if (added !== undefined) {
        record(makeHistoryCommand({ kind: "remove", segment: added }));
      }
      void queryClient.invalidateQueries({
        queryKey: showDesignQueryKey(ids.studioId, ids.showId),
      });
    },
    [
      applyResult,
      currentStoryboard,
      makeHistoryCommand,
      queryClient,
      record,
      requireScope,
    ],
  );
  const duplicate = useCallback(
    async (episodeSegmentId: string): Promise<void> => {
      const ids = requireScope();
      const beforeIds = new Set(
        currentStoryboard()?.items.map(
          ({ episodeSegment }) => episodeSegment.id,
        ) ?? [],
      );
      const updated = await applyResult(() =>
        window.showflow.episodes.duplicateSegment({
          ...ids,
          episodeSegmentId,
        }),
      );
      const duplicateSegment = updated.items.find(
        ({ episodeSegment }) => !beforeIds.has(episodeSegment.id),
      )?.episodeSegment;
      if (duplicateSegment !== undefined) {
        record(
          makeHistoryCommand({ kind: "remove", segment: duplicateSegment }),
        );
      }
    },
    [applyResult, currentStoryboard, makeHistoryCommand, record, requireScope],
  );
  const remove = useCallback(
    async (episodeSegmentId: string): Promise<void> => {
      const ids = requireScope();
      const segment = currentStoryboard()?.items.find(
        (item) => item.episodeSegment.id === episodeSegmentId,
      )?.episodeSegment;
      await applyResult(() =>
        window.showflow.episodes.removeSegment({ ...ids, episodeSegmentId }),
      );
      if (segment !== undefined) {
        record(makeHistoryCommand({ kind: "restore", segment }));
      }
    },
    [applyResult, currentStoryboard, makeHistoryCommand, record, requireScope],
  );
  const reorder = useCallback(
    async (orderedIds: readonly string[]): Promise<void> => {
      const ids = requireScope();
      const previous =
        currentStoryboard()?.items.map(
          ({ episodeSegment }) => episodeSegment.id,
        ) ?? [];
      if (previous.every((id, index) => id === orderedIds[index])) return;
      await applyResult(() =>
        window.showflow.episodes.reorder({
          ...ids,
          orderedEpisodeSegmentIds: [...orderedIds],
        }),
      );
      record(
        makeHistoryCommand({
          inverseIds: orderedIds,
          kind: "reorder",
          orderedIds: previous,
        }),
      );
    },
    [applyResult, currentStoryboard, makeHistoryCommand, record, requireScope],
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
        to.current.push(await command());
      } catch {
        from.current.push(command);
      } finally {
        setHistoryVersion((version) => version + 1);
      }
    },
    [],
  );
  void historyVersion;

  return {
    addExisting,
    canRedo: redoStack.current.length > 0,
    canUndo: undoStack.current.length > 0,
    createSegment,
    duplicate,
    error,
    isSaving: saveState === "saving",
    redo: () => runHistory(redoStack, undoStack),
    remove,
    reorder,
    saveState,
    undo: () => runHistory(undoStack, redoStack),
  };
};
