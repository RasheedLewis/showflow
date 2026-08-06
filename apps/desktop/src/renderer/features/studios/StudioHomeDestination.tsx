import { ApplicationShell, Button, Skeleton } from "@showflow/ui";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import type { StudioDto } from "@showflow/contracts";

import styles from "./studio-pages.module.css";

type StudioLoadState =
  | { readonly status: "loading" }
  | { readonly status: "success"; readonly studio: StudioDto }
  | { readonly status: "error"; readonly message: string };

export const StudioHomeDestination = () => {
  const navigate = useNavigate();
  const { studioId } = useParams<{ studioId: string }>();
  const [loadState, setLoadState] = useState<StudioLoadState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;

    const loadStudio = async (): Promise<void> => {
      if (studioId === undefined) {
        setLoadState({
          status: "error",
          message: "This Studio route is incomplete. Return to Studio setup.",
        });
        return;
      }

      try {
        const result = await window.showflow.studios.get({ studioId });
        if (!active) return;

        setLoadState(
          result.ok
            ? { status: "success", studio: result.data }
            : { status: "error", message: result.error.message },
        );
      } catch {
        if (active) {
          setLoadState({
            status: "error",
            message:
              "Showflow could not load this Studio. Your saved work was not changed. Try again.",
          });
        }
      }
    };

    void loadStudio();
    return () => {
      active = false;
    };
  }, [studioId]);

  const studio = loadState.status === "success" ? loadState.studio : undefined;

  return (
    <ApplicationShell
      breadcrumb={<span>Studio</span>}
      primaryAction={
        loadState.status === "error" ? (
          <Button onClick={() => navigate("/studio/new")} variant="primary">
            Return to Studio setup
          </Button>
        ) : (
          <span />
        )
      }
      studioSwitcher={
        <Button disabled size="small" variant="ghost">
          {studio?.name ?? "Studio"}
        </Button>
      }
      title={studio?.name ?? "Studio Home"}
    >
      <div className={styles.workspace}>
        {loadState.status === "loading" ? (
          <section aria-label="Loading Studio" className={styles.card}>
            <Skeleton label="Loading Studio" />
            <Skeleton label="Loading Studio details" />
          </section>
        ) : loadState.status === "error" ? (
          <section
            aria-labelledby="studio-error-heading"
            className={styles.card}
          >
            <p className={styles.eyebrow}>Studio unavailable</p>
            <h2 className={styles.heading} id="studio-error-heading">
              Showflow could not open this Studio
            </h2>
            <p className={styles.message} role="alert">
              {loadState.message}
            </p>
          </section>
        ) : (
          <section
            aria-labelledby="studio-ready-heading"
            className={styles.card}
          >
            <p className={styles.eyebrow}>Studio created</p>
            <h2 className={styles.heading} id="studio-ready-heading">
              {loadState.studio.name} is ready
            </h2>
            <p className={styles.description}>
              This Studio is selected. Its Shows, brand assets, and production
              resources will live here.
            </p>
            <div className={styles.homeDetails}>
              <p className={styles.homeLabel}>Studio Home</p>
              <p className={styles.description}>
                Your Show collection will appear in this workspace.
              </p>
            </div>
          </section>
        )}
      </div>
    </ApplicationShell>
  );
};
