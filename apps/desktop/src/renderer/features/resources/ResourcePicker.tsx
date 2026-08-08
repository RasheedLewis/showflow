import type { ResourceContext, ResourceDto } from "@showflow/contracts";
import {
  Badge,
  Button,
  Drawer,
  Select,
  Skeleton,
  TextInput,
} from "@showflow/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { loadResources, resourceQueryKey } from "./resource-queries";
import styles from "./resource-picker.module.css";

type CompatibleCategory = "image" | "video" | "audio";

const scopeLabel = (resource: ResourceDto): string => {
  switch (resource.owner.scope) {
    case "studio":
      return "Studio";
    case "show":
      return "Show";
    case "episode":
      return "Episode";
  }
};

const operationContext = (
  resource: ResourceDto,
  current: ResourceContext,
): ResourceContext => {
  switch (resource.owner.scope) {
    case "studio":
      return { scope: "studio", studioId: current.studioId };
    case "show":
      return {
        scope: "show",
        studioId: current.studioId,
        showId: resource.owner.showId,
      };
    case "episode":
      if (current.scope !== "episode") return current;
      return {
        scope: "episode",
        studioId: current.studioId,
        showId: current.showId,
        episodeId: resource.owner.episodeId,
      };
  }
};

const ResourcePreview = ({
  context,
  resource,
  visualLabel,
  videoControls = false,
}: {
  readonly context: ResourceContext;
  readonly resource: ResourceDto;
  readonly visualLabel?: string;
  readonly videoControls?: boolean;
}) => {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    let active = true;
    void window.showflow.resources
      .getUrl({
        resourceId: resource.id,
        studioId: context.studioId,
        variant: resource.category === "image" ? "thumbnail" : "content",
      })
      .then((result) => {
        if (active && result.ok) setUrl(result.data);
      });
    return () => {
      active = false;
    };
  }, [context.studioId, resource.category, resource.id]);

  const reportMetadata = (metadata: {
    readonly dimensions?: { readonly height: number; readonly width: number };
    readonly durationMs?: number;
    readonly unsupported?: boolean;
  }): void => {
    const dimensionsMatch =
      metadata.dimensions === undefined ||
      (metadata.dimensions.height === resource.dimensions?.height &&
        metadata.dimensions.width === resource.dimensions.width);
    const durationMatches =
      metadata.durationMs === undefined ||
      Math.round(metadata.durationMs) === resource.durationMs;
    if (
      metadata.unsupported !== true &&
      dimensionsMatch &&
      durationMatches &&
      resource.availability === "available"
    ) {
      return;
    }
    void window.showflow.resources
      .updateMetadata({
        context: operationContext(resource, context),
        dimensions: metadata.dimensions,
        durationMs:
          metadata.durationMs === undefined
            ? undefined
            : Math.round(metadata.durationMs),
        resourceId: resource.id,
        unsupported: metadata.unsupported,
      })
      .then((result) => {
        if (result.ok) {
          queryClient.setQueryData(resourceQueryKey(context), result.data);
        }
      });
  };

  if (url === undefined || resource.availability !== "available") {
    return <span aria-hidden="true">{resource.category.toUpperCase()}</span>;
  }
  if (resource.category === "image") {
    return (
      <img
        alt={visualLabel ?? ""}
        onError={() => reportMetadata({ unsupported: true })}
        onLoad={(event) =>
          reportMetadata({
            dimensions: {
              height: event.currentTarget.naturalHeight,
              width: event.currentTarget.naturalWidth,
            },
          })
        }
        src={url}
      />
    );
  }
  if (resource.category === "video") {
    return (
      <video
        aria-label={visualLabel ?? `${resource.displayName} metadata preview`}
        controls={videoControls}
        muted
        onError={() => reportMetadata({ unsupported: true })}
        onLoadedMetadata={(event) =>
          reportMetadata({
            dimensions: {
              height: event.currentTarget.videoHeight,
              width: event.currentTarget.videoWidth,
            },
            durationMs: event.currentTarget.duration * 1_000,
          })
        }
        preload="metadata"
        src={url}
      />
    );
  }
  return (
    <audio
      aria-label={`${resource.displayName} metadata preview`}
      onError={() => reportMetadata({ unsupported: true })}
      onLoadedMetadata={(event) =>
        reportMetadata({ durationMs: event.currentTarget.duration * 1_000 })
      }
      preload="metadata"
      src={url}
    />
  );
};

export const ResourcePicker = ({
  category,
  context,
  inputId,
  issue,
  label,
  onSelect,
  required,
  selectedResourceId,
}: {
  readonly category: CompatibleCategory;
  readonly context: ResourceContext;
  readonly inputId: string;
  readonly issue?: string;
  readonly label: string;
  readonly onSelect: (resourceId: string | undefined) => void;
  readonly required: boolean;
  readonly selectedResourceId?: string;
}) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CompatibleCategory>(
    category,
  );
  const [actionError, setActionError] = useState<string>();
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    enabled: open || selectedResourceId !== undefined,
    queryFn: () => loadResources(context),
    queryKey: resourceQueryKey(context),
    retry: false,
  });
  const selected = query.data?.find(({ id }) => id === selectedResourceId);
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter(
        (resource) =>
          (typeFilter === "all" || resource.category === typeFilter) &&
          resource.displayName
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [query.data, search, typeFilter],
  );
  const browserError =
    actionError ??
    (query.error instanceof Error ? query.error.message : undefined);

  const applyResult = (
    result: Awaited<ReturnType<typeof window.showflow.resources.list>>,
  ): void => {
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    setActionError(undefined);
    queryClient.setQueryData(resourceQueryKey(context), result.data);
  };
  const importNative = async (): Promise<void> => {
    setBusy(true);
    try {
      applyResult(await window.showflow.resources.import({ context }));
    } finally {
      setBusy(false);
    }
  };
  const repair = async (resource: ResourceDto, mode: "locate" | "replace") => {
    setBusy(true);
    try {
      const request = {
        context: operationContext(resource, context),
        resourceId: resource.id,
      };
      applyResult(
        mode === "locate"
          ? await window.showflow.resources.locate(request)
          : await window.showflow.resources.replace(request),
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async (resource: ResourceDto): Promise<void> => {
    const usages = resource.usage.map(
      (usage) =>
        `${usage.episodeTitle} — ${usage.segmentName} (${usage.fieldKey})`,
    );
    const message =
      usages.length === 0
        ? `Remove ${resource.displayName} from Showflow? The original file stays on disk.`
        : `Remove ${resource.displayName}? It is used in:\n${usages.join("\n")}\nThose fields will need a replacement.`;
    if (!window.confirm(message)) return;
    applyResult(
      await window.showflow.resources.remove({
        context: operationContext(resource, context),
        resourceId: resource.id,
      }),
    );
    if (selectedResourceId === resource.id) onSelect(undefined);
  };
  const rename = async (resource: ResourceDto): Promise<void> => {
    const displayName = (
      nameDrafts[resource.id] ?? resource.displayName
    ).trim();
    if (displayName === resource.displayName) return;
    setBusy(true);
    try {
      applyResult(
        await window.showflow.resources.rename({
          context: operationContext(resource, context),
          displayName,
          resourceId: resource.id,
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.field}>
      <span className={styles.label}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {selected === undefined || selected.category === "audio" ? null : (
        <figure className={styles.selectedVisual}>
          <div className={styles.preview}>
            <ResourcePreview
              context={context}
              resource={selected}
              videoControls={selected.category === "video"}
              visualLabel={`${selected.displayName} preview`}
            />
          </div>
          <figcaption>{selected.displayName} preview</figcaption>
        </figure>
      )}
      <div className={styles.selectionRow}>
        <Button
          aria-describedby={
            issue === undefined ? undefined : `${inputId}-message`
          }
          aria-invalid={issue === undefined ? undefined : true}
          id={inputId}
          onClick={() => setOpen(true)}
          variant={issue === undefined ? "secondary" : "destructive"}
        >
          {selected === undefined ? `Choose ${category}` : selected.displayName}
        </Button>
        {selectedResourceId === undefined ? null : (
          <Button
            onClick={() => onSelect(undefined)}
            size="small"
            variant="ghost"
          >
            Clear
          </Button>
        )}
      </div>
      {issue === undefined ? null : (
        <span className={styles.issue} id={`${inputId}-message`} role="alert">
          {issue}
        </span>
      )}
      <Drawer
        description={`Import, search, and choose a compatible ${category} Resource. Files remain linked in their original location.`}
        footer={
          <Button
            disabled={busy}
            onClick={() => void importNative()}
            variant="primary"
          >
            Import {category}
          </Button>
        }
        onOpenChange={setOpen}
        open={open}
        title="Resource Browser"
      >
        <div
          className={styles.browser}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const files = [...event.dataTransfer.files];
            if (files.length === 0) return;
            setBusy(true);
            void window.showflow.resources
              .importDropped({ context }, files)
              .then(applyResult)
              .finally(() => setBusy(false));
          }}
        >
          <div className={styles.filters}>
            <TextInput
              label="Search Resources"
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Search by name"
              type="search"
              value={search}
            />
            <Select
              label="Type"
              onChange={(event) =>
                setTypeFilter(event.currentTarget.value as typeof typeFilter)
              }
              options={[
                { label: "All media", value: "all" },
                { label: "Images", value: "image" },
                { label: "Video", value: "video" },
                { label: "Audio", value: "audio" },
              ]}
              value={typeFilter}
            />
          </div>
          <p className={styles.dropHint}>
            Drop image, video, or audio files here to import them.
          </p>
          {browserError === undefined ? null : (
            <p className={styles.issue} role="alert">
              {browserError}
            </p>
          )}
          {query.isPending ? (
            <Skeleton label="Loading Resources" />
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <h3>No Resources found</h3>
              <p>
                Import media for this Episode, or adjust the search and type
                filter.
              </p>
            </div>
          ) : (
            <ul className={styles.list}>
              {filtered.map((resource) => {
                const compatible = resource.category === category;
                return (
                  <li className={styles.card} key={resource.id}>
                    <div className={styles.preview}>
                      <ResourcePreview context={context} resource={resource} />
                    </div>
                    <div className={styles.cardCopy}>
                      <strong>{resource.displayName}</strong>
                      <span>{resource.originalFilename}</span>
                      <div className={styles.badges}>
                        <Badge tone="neutral">{scopeLabel(resource)}</Badge>
                        <Badge
                          tone={
                            resource.availability === "available"
                              ? "success"
                              : "warning"
                          }
                        >
                          {resource.availability === "available"
                            ? "Available"
                            : resource.availability === "missing"
                              ? "Missing"
                              : resource.availability === "unsupported"
                                ? "Unsupported"
                                : "Permission required"}
                        </Badge>
                      </div>
                      {resource.usage.length === 0 ? (
                        <span>Not used yet</span>
                      ) : (
                        <details>
                          <summary>
                            Used in {resource.usage.length}{" "}
                            {resource.usage.length === 1 ? "place" : "places"}
                          </summary>
                          <ul>
                            {resource.usage.map((usage) => (
                              <li
                                key={`${usage.episodeSegmentId}-${usage.fieldKey}`}
                              >
                                {usage.episodeTitle} — {usage.segmentName}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      <details>
                        <summary>Rename</summary>
                        <div className={styles.renameRow}>
                          <TextInput
                            label={`Resource name for ${resource.displayName}`}
                            maxLength={255}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setNameDrafts((current) => ({
                                ...current,
                                [resource.id]: value,
                              }));
                            }}
                            value={
                              nameDrafts[resource.id] ?? resource.displayName
                            }
                          />
                          <Button
                            disabled={
                              busy ||
                              (
                                nameDrafts[resource.id] ?? resource.displayName
                              ).trim().length === 0
                            }
                            onClick={() => void rename(resource)}
                            size="small"
                            variant="secondary"
                          >
                            Save name
                          </Button>
                        </div>
                      </details>
                    </div>
                    <div className={styles.actions}>
                      <Button
                        disabled={
                          !compatible || resource.availability !== "available"
                        }
                        onClick={() => {
                          onSelect(resource.id);
                          setOpen(false);
                        }}
                        size="small"
                        variant={
                          selectedResourceId === resource.id
                            ? "primary"
                            : "secondary"
                        }
                      >
                        {compatible ? "Choose" : `Needs ${category}`}
                      </Button>
                      {resource.availability === "missing" ||
                      resource.availability === "unavailable" ? (
                        <Button
                          disabled={busy}
                          onClick={() => void repair(resource, "locate")}
                          size="small"
                          variant="ghost"
                        >
                          Locate
                        </Button>
                      ) : null}
                      <Button
                        disabled={busy}
                        onClick={() => void repair(resource, "replace")}
                        size="small"
                        variant="ghost"
                      >
                        Replace
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => void remove(resource)}
                        size="small"
                        variant="destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Drawer>
    </div>
  );
};
