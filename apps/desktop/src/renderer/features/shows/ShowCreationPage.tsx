import {
  ApplicationShell,
  Button,
  Skeleton,
  TextArea,
  TextInput,
} from "@showflow/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { ShowCardDto, ShowDesignDto } from "@showflow/contracts";

import { getDesignShowRoute, getStudioHomeRoute } from "../../app-routes.mts";
import { ParentNavigation } from "../navigation/ParentNavigation";
import { StudioSwitcher } from "../studios/StudioSwitcher";
import { loadStudio, studioQueryKey } from "../studios/studio-queries";
import studioStyles from "../studios/studio-pages.module.css";
import { showDesignQueryKey, studioShowsQueryKey } from "./show-queries";

export const ShowCreationPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { studioId } = useParams<{ studioId: string }>();
  const studioQuery = useQuery({
    queryFn: () => {
      if (studioId === undefined)
        throw new Error("This Studio route is incomplete.");
      return loadStudio(studioId);
    },
    queryKey: studioQueryKey(studioId ?? "incomplete"),
    retry: false,
  });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [selectionError, setSelectionError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdDesign, setCreatedDesign] = useState<ShowDesignDto>();
  const studio = studioQuery.data;

  const openDesignShow = async (design: ShowDesignDto): Promise<void> => {
    const route = getDesignShowRoute(design.show.studioId, design.show.id);
    const settingsResult = await window.showflow.app.updateNavigation({
      lastRoute: route,
      lastStudioId: design.show.studioId,
    });
    if (!settingsResult.ok) {
      setCreatedDesign(design);
      setRequestError(
        "The Show was created, but Showflow could not open Design Show. Try opening it again.",
      );
      return;
    }
    navigate(route);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || studioId === undefined) return;
    const normalizedName = name.trim();
    if (normalizedName.length === 0) {
      setNameError("Enter a Show name.");
      return;
    }

    setNameError(undefined);
    setRequestError(undefined);
    setIsSubmitting(true);
    try {
      if (createdDesign !== undefined) {
        await openDesignShow(createdDesign);
        return;
      }
      const normalizedDescription = description.trim();
      const result = await window.showflow.shows.create({
        studioId,
        name: normalizedName,
        ...(normalizedDescription === ""
          ? {}
          : { description: normalizedDescription }),
      });
      if (!result.ok) {
        setRequestError(result.error.message);
        return;
      }
      setCreatedDesign(result.data);
      setName(result.data.show.name);
      setDescription(result.data.show.description ?? "");
      queryClient.setQueryData(
        showDesignQueryKey(studioId, result.data.show.id),
        result.data,
      );
      queryClient.setQueryData<readonly ShowCardDto[]>(
        studioShowsQueryKey(studioId),
        (cards = []) =>
          cards.some((card) => card.show.id === result.data.show.id)
            ? cards
            : [...cards, { episodeCount: 0, show: result.data.show }],
      );
      await openDesignShow(result.data);
    } catch {
      setRequestError(
        "Showflow could not finish creating the Show. Nothing was changed. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ApplicationShell
      parentNavigation={
        studioId === undefined ? undefined : (
          <ParentNavigation
            accessibleLabel="Back to Shows"
            label="Shows"
            to={getStudioHomeRoute(studioId)}
          />
        )
      }
      primaryAction={
        <Button
          disabled={isSubmitting || studioQuery.isError}
          form="create-show-form"
          type="submit"
          variant="primary"
        >
          {isSubmitting
            ? "Creating Show…"
            : createdDesign === undefined
              ? "Create Show"
              : "Open Design Show"}
        </Button>
      }
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
      title="Create Show"
    >
      <div className={studioStyles.workspace}>
        {selectionError ? (
          <p className={studioStyles.switcherError} role="alert">
            {selectionError}
          </p>
        ) : null}
        {studioQuery.isPending ? (
          <section aria-label="Loading Studio" className={studioStyles.card}>
            <Skeleton label="Loading Studio" />
          </section>
        ) : studioQuery.isError ? (
          <section className={studioStyles.card}>
            <h2 className={studioStyles.heading}>Studio unavailable</h2>
            <p className={studioStyles.message} role="alert">
              Showflow could not load this Studio. Return to Studio Home and try
              again.
            </p>
          </section>
        ) : (
          <section
            aria-labelledby="create-show-heading"
            className={studioStyles.card}
          >
            <p className={studioStyles.eyebrow}>Blank Show</p>
            <h2 className={studioStyles.heading} id="create-show-heading">
              Design a reusable production
            </h2>
            <p className={studioStyles.description}>
              Start with an empty Show Blueprint. You’ll add reusable Segments
              in Design Show.
            </p>
            <form
              className={studioStyles.form}
              id="create-show-form"
              noValidate
              onSubmit={(event) => void handleSubmit(event)}
            >
              <TextInput
                autoFocus
                disabled={createdDesign !== undefined}
                {...(nameError === undefined ? {} : { error: nameError })}
                label="Show name"
                maxLength={200}
                onChange={(event) => {
                  setName(event.currentTarget.value);
                  if (nameError !== undefined) setNameError(undefined);
                }}
                placeholder="Top 10 Music Videos"
                required
                value={name}
              />
              <TextArea
                disabled={createdDesign !== undefined}
                helpText="Optional"
                label="Description"
                onChange={(event) => setDescription(event.currentTarget.value)}
                rows={4}
                value={description}
              />
              <div className={studioStyles.thumbnailPlaceholder}>
                <p className={studioStyles.eyebrow}>Thumbnail · Optional</p>
                <p className={studioStyles.description}>
                  You can add a thumbnail later from Show settings.
                </p>
              </div>
              {requestError ? (
                <p className={studioStyles.message} role="alert">
                  {requestError}
                </p>
              ) : null}
            </form>
          </section>
        )}
      </div>
    </ApplicationShell>
  );
};
