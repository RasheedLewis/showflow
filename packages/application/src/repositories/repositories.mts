import type {
  Component,
  ComponentId,
  Episode,
  EpisodeId,
  Layout,
  LayoutId,
  Resource,
  ResourceId,
  ResourceOwner,
  Show,
  ShowBlueprint,
  ShowBlueprintId,
  ShowId,
  ShowSegment,
  ShowSegmentId,
  Studio,
  StudioId,
} from "@showflow/domain";

import type { ApplicationSettingsRepository } from "../settings/application-settings.mjs";

export interface EntityRepository<TEntity, TEntityId> {
  getById(id: TEntityId): Promise<TEntity | null>;
  save(entity: TEntity): Promise<void>;
}

export interface StudioRepository extends EntityRepository<Studio, StudioId> {
  list(): Promise<readonly Studio[]>;
}

export interface ShowRepository extends EntityRepository<Show, ShowId> {
  listByStudioId(studioId: StudioId): Promise<readonly Show[]>;
}

export interface ShowBlueprintRepository extends EntityRepository<
  ShowBlueprint,
  ShowBlueprintId
> {
  getByShowId(showId: ShowId): Promise<ShowBlueprint | null>;
}

export interface ShowCreationRepository {
  create(show: Show, blueprint: ShowBlueprint): Promise<void>;
}

export interface ShowSegmentRepository extends EntityRepository<
  ShowSegment,
  ShowSegmentId
> {
  listByShowId(showId: ShowId): Promise<readonly ShowSegment[]>;
}

export interface LayoutRepository extends EntityRepository<Layout, LayoutId> {
  listByShowId(showId: ShowId): Promise<readonly Layout[]>;
}

export interface ComponentRepository extends EntityRepository<
  Component,
  ComponentId
> {
  listByShowId(showId: ShowId): Promise<readonly Component[]>;
}

export interface ResourceRepository extends EntityRepository<
  Resource,
  ResourceId
> {
  listByOwner(owner: ResourceOwner): Promise<readonly Resource[]>;
}

export interface EpisodeRepository extends EntityRepository<
  Episode,
  EpisodeId
> {
  listByShowId(showId: ShowId): Promise<readonly Episode[]>;
}

export interface TransactionRepositories {
  readonly studios: StudioRepository;
  readonly shows: ShowRepository;
  readonly blueprints: ShowBlueprintRepository;
  readonly segments: ShowSegmentRepository;
  readonly layouts: LayoutRepository;
  readonly components: ComponentRepository;
  readonly resources: ResourceRepository;
  readonly episodes: EpisodeRepository;
  readonly settings: ApplicationSettingsRepository;
}

export interface TransactionRunner {
  run<TResult>(
    operation: (repositories: TransactionRepositories) => Promise<TResult>,
  ): Promise<TResult>;
}

export interface ApplicationRepositories extends TransactionRepositories {
  readonly transactions: TransactionRunner;
}
