import type {
  EpisodeStoryboardDto,
  UpdateEpisodeSegmentRequest,
} from "@showflow/contracts";
import type { SaveState } from "@showflow/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { episodeListQueryKey, episodeQueryKey } from "./episode-queries";

export interface EpisodeSegmentContentDraft {
  readonly expectedDurationOverrideMs: number | null;
  readonly fieldValues: UpdateEpisodeSegmentRequest["fieldValues"];
  readonly notes: string;
}

const draftOf = (
  item: EpisodeStoryboardDto["items"][number],
): EpisodeSegmentContentDraft => ({
  expectedDurationOverrideMs: item.episodeSegment.expectedDurationOverrideMs,
  fieldValues: item.episodeSegment
    .fieldValues as UpdateEpisodeSegmentRequest["fieldValues"],
  notes: item.episodeSegment.notes,
});

const sameDraft = (
  left: EpisodeSegmentContentDraft,
  right: EpisodeSegmentContentDraft,
): boolean =>
  left.expectedDurationOverrideMs === right.expectedDurationOverrideMs &&
  left.notes === right.notes &&
  JSON.stringify(left.fieldValues) === JSON.stringify(right.fieldValues);

export const useEpisodeSegmentContent = (
  storyboard: EpisodeStoryboardDto | undefined,
  item: EpisodeStoryboardDto["items"][number] | undefined,
) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<EpisodeSegmentContentDraft | undefined>(
    item === undefined ? undefined : draftOf(item),
  );
  const [error, setError] = useState<string>();
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const activeIdRef = useRef(item?.episodeSegment.id);
  const draftRef = useRef(draft);
  const savedRef = useRef(draft);
  const updatedAtRef = useRef(item?.episodeSegment.updatedAt);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (item === undefined) return;
    if (activeIdRef.current === item.episodeSegment.id) return;
    const next = draftOf(item);
    activeIdRef.current = item.episodeSegment.id;
    draftRef.current = next;
    savedRef.current = next;
    updatedAtRef.current = item.episodeSegment.updatedAt;
    setDraft(next);
    setError(undefined);
    setSaveState("saved");
  }, [item]);

  const enqueue = useCallback(
    (snapshot: EpisodeSegmentContentDraft): Promise<void> => {
      if (storyboard === undefined || item === undefined) {
        return Promise.reject(new Error("Episode Segment is not loaded."));
      }
      const scope = {
        episodeId: storyboard.episode.id,
        showId: storyboard.show.id,
        studioId: storyboard.show.studioId,
      };
      pendingCountRef.current += 1;
      setSaveState("saving");
      setError(undefined);
      const operation = queueRef.current
        .catch(() => undefined)
        .then(async () => {
          const expectedUpdatedAt = updatedAtRef.current;
          if (expectedUpdatedAt === undefined) {
            throw new Error("Episode Segment save version is unavailable.");
          }
          const result = await window.showflow.episodes.updateSegment({
            ...scope,
            episodeSegmentId: item.episodeSegment.id,
            expectedDurationOverrideMs: snapshot.expectedDurationOverrideMs,
            expectedUpdatedAt,
            fieldValues: snapshot.fieldValues,
            notes: snapshot.notes,
          });
          if (!result.ok) throw new Error(result.error.message);
          const updatedItem = result.data.items.find(
            ({ episodeSegment }) =>
              episodeSegment.id === item.episodeSegment.id,
          );
          if (updatedItem === undefined) {
            throw new Error("Showflow could not reload the saved Segment.");
          }
          updatedAtRef.current = updatedItem.episodeSegment.updatedAt;
          savedRef.current = snapshot;
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
          pendingCountRef.current -= 1;
          if (mountedRef.current && pendingCountRef.current === 0) {
            setSaveState("saved");
          }
        })
        .catch((saveError: unknown) => {
          pendingCountRef.current -= 1;
          const message =
            saveError instanceof Error
              ? saveError.message
              : "Showflow could not save the Episode Segment.";
          if (mountedRef.current) {
            setError(message);
            setSaveState("error");
          }
          throw saveError;
        });
      queueRef.current = operation.catch(() => undefined);
      return operation;
    },
    [item, queryClient, storyboard],
  );

  const flush = useCallback(async (): Promise<void> => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    const current = draftRef.current;
    const saved = savedRef.current;
    if (
      current !== undefined &&
      (saved === undefined || !sameDraft(current, saved))
    ) {
      await enqueue(current);
    } else {
      await queueRef.current;
    }
  }, [enqueue]);

  const update = useCallback(
    (next: EpisodeSegmentContentDraft): void => {
      draftRef.current = next;
      setDraft(next);
      setSaveState("saving");
      if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = undefined;
        const current = draftRef.current;
        if (current !== undefined) void enqueue(current).catch(() => undefined);
      }, 400);
    },
    [enqueue],
  );

  useEffect(
    () => () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
        const current = draftRef.current;
        const saved = savedRef.current;
        if (
          current !== undefined &&
          (saved === undefined || !sameDraft(current, saved))
        ) {
          void enqueue(current).catch(() => undefined);
        }
      }
    },
    [enqueue],
  );

  return { draft, error, flush, saveState, update };
};
