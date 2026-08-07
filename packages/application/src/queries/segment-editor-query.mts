import {
  assertShowSegmentOwnedByShow,
  validateShowSegmentDefinition,
  type SegmentDataFieldId,
  type ShowId,
  type ShowSegment,
  type ShowSegmentId,
  type StudioId,
} from "@showflow/domain";

import { requireQueryEntity } from "./query-support.mjs";
import { ApplicationError } from "../errors/application-error.mjs";
import type {
  SegmentDataFieldUsageRepository,
  ShowRepository,
  ShowSegmentRepository,
} from "../repositories/repositories.mjs";

export interface ShowSegmentEditor {
  readonly episodeValueUsageByFieldId: Readonly<
    Record<SegmentDataFieldId, number>
  >;
  readonly segment: ShowSegment;
  readonly validationIssues: ReturnType<typeof validateShowSegmentDefinition>;
}

export class GetShowSegmentEditorQuery {
  constructor(
    readonly repositories: {
      readonly shows: ShowRepository;
      readonly segments: ShowSegmentRepository &
        SegmentDataFieldUsageRepository;
    },
  ) {}

  async execute(
    studioId: StudioId,
    showId: ShowId,
    showSegmentId: ShowSegmentId,
  ): Promise<ShowSegmentEditor> {
    const show = requireQueryEntity(
      await this.repositories.shows.getById(showId),
      "Show",
    );
    if (show.studioId !== studioId) {
      throw new ApplicationError("NOT_FOUND", "Show was not found.");
    }
    const segment = requireQueryEntity(
      await this.repositories.segments.getById(showSegmentId),
      "Show Segment",
    );
    assertShowSegmentOwnedByShow(segment, show.id);
    const usages = await Promise.all(
      segment.dataFields.map(
        async (field) =>
          [
            field.id,
            await this.repositories.segments.countEpisodeFieldValues(
              segment.id,
              field.key,
            ),
          ] as const,
      ),
    );
    return {
      episodeValueUsageByFieldId: Object.fromEntries(usages) as Readonly<
        Record<SegmentDataFieldId, number>
      >,
      segment,
      validationIssues: validateShowSegmentDefinition(segment),
    };
  }
}
