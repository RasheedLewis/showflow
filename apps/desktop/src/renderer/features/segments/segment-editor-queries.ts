import type { ShowSegmentEditorDto } from "@showflow/contracts";

export const segmentEditorQueryKey = (
  studioId: string,
  showId: string,
  showSegmentId: string,
) => ["segment-editor", studioId, showId, showSegmentId] as const;

export const loadSegmentEditor = async (
  studioId: string,
  showId: string,
  showSegmentId: string,
): Promise<ShowSegmentEditorDto> => {
  const result = await window.showflow.segments.getEditor({
    showId,
    showSegmentId,
    studioId,
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
};
