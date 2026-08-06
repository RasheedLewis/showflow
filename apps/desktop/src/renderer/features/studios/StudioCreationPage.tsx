import { ApplicationShell, Button, TextInput } from "@showflow/ui";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import type { StudioDto } from "@showflow/contracts";

import styles from "./studio-pages.module.css";

const studioRoute = (studioId: string): string => `/studio/${studioId}`;

export const StudioCreationPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdStudio, setCreatedStudio] = useState<StudioDto>();

  const selectAndOpenStudio = async (studio: StudioDto): Promise<void> => {
    const route = studioRoute(studio.id);
    const settingsResult = await window.showflow.app.updateNavigation({
      lastRoute: route,
      lastStudioId: studio.id,
    });

    if (!settingsResult.ok) {
      setCreatedStudio(studio);
      setRequestError(
        "The Studio was created, but Showflow could not select it. Try opening it again.",
      );
      return;
    }

    navigate(route);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedName = name.trim();
    if (normalizedName.length === 0) {
      setNameError("Enter a Studio name.");
      return;
    }

    setNameError(undefined);
    setRequestError(undefined);
    setIsSubmitting(true);

    try {
      if (createdStudio !== undefined) {
        await selectAndOpenStudio(createdStudio);
        return;
      }

      const result = await window.showflow.studios.create({
        name: normalizedName,
      });
      if (!result.ok) {
        setRequestError(result.error.message);
        return;
      }

      setCreatedStudio(result.data);
      setName(result.data.name);
      await selectAndOpenStudio(result.data);
    } catch {
      setRequestError(
        "Showflow could not finish creating the Studio. Nothing was changed. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ApplicationShell
      breadcrumb={<span>Studio setup</span>}
      primaryAction={
        <Button
          disabled={isSubmitting}
          form="create-studio-form"
          size="large"
          type="submit"
          variant="primary"
        >
          {isSubmitting
            ? "Creating Studio…"
            : createdStudio === undefined
              ? "Create Studio"
              : "Open Studio"}
        </Button>
      }
      studioSwitcher={
        <Button disabled size="small" variant="ghost">
          No Studio
        </Button>
      }
      title="Create Studio"
    >
      <div className={styles.workspace}>
        <section
          aria-labelledby="create-studio-heading"
          className={styles.card}
        >
          <p className={styles.eyebrow}>Your production workspace</p>
          <h2 className={styles.heading} id="create-studio-heading">
            Create your first Studio
          </h2>
          <p className={styles.description}>
            A Studio contains your Shows, brand assets, and production
            resources.
          </p>
          <form
            className={styles.form}
            id="create-studio-form"
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
          >
            <TextInput
              autoComplete="organization"
              autoFocus
              disabled={createdStudio !== undefined}
              {...(nameError === undefined ? {} : { error: nameError })}
              label="Studio name"
              maxLength={200}
              onChange={(event) => {
                setName(event.currentTarget.value);
                if (nameError !== undefined) setNameError(undefined);
              }}
              placeholder="Public Sphere Studio"
              required
              value={name}
            />
            <p className={styles.description}>
              You can add a logo later from Studio settings.
            </p>
            {requestError ? (
              <p className={styles.message} role="alert">
                {requestError}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </ApplicationShell>
  );
};
