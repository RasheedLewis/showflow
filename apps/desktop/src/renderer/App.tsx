import {
  ApplicationShell,
  Button,
  IconButton,
  InspectorSection,
  NotesPanel,
  SaveStateIndicator,
} from "@showflow/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLayoutEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";

import {
  APPLICATION_FOUNDATION_ROUTE,
  STUDIO_CREATION_ROUTE,
  STUDIO_HOME_ROUTE,
  SHOW_CREATION_ROUTE,
  SHOW_DETAIL_ROUTE,
  DESIGN_SHOW_ROUTE,
  DESIGN_SHOW_ROOT_ROUTE,
  DESIGN_SHOW_SEGMENT_ROUTE,
  DESIGN_SHOW_LAYOUT_ROUTE,
  EPISODE_CREATION_ROUTE,
  PRODUCE_EPISODE_ROUTE,
  EPISODE_SEGMENT_ROUTE,
  getDesignShowRoute,
} from "./app-routes.mts";
import { ComponentGallery } from "./development/ComponentGallery";
import { COMPONENT_GALLERY_ROUTE } from "./development/component-gallery-contract.mts";
import { StudioCreationPage } from "./features/studios/StudioCreationPage";
import { StudioHomeDestination } from "./features/studios/StudioHomeDestination";
import { ShowCreationPage } from "./features/shows/ShowCreationPage";
import { DesignShowDestination } from "./features/shows/DesignShowDestination";
import { ShowDetailDestination } from "./features/shows/ShowDetailDestination";
import { StartupDestination } from "./features/startup/StartupDestination";
import { EpisodeCreationPage } from "./features/episodes/EpisodeCreationPage";
import { ProduceEpisodeDestination } from "./features/episodes/ProduceEpisodeDestination";
import { EpisodeSegmentEditorDestination } from "./features/episodes/EpisodeSegmentEditorDestination";
import { ShowSegmentEditorDestination } from "./features/segments/ShowSegmentEditorDestination";
import { LayoutEditorDestination } from "./features/layouts/LayoutEditorDestination";
import { resolveNavigationFocusId } from "./features/navigation/navigation-origin.mts";

const RouteFocusManager = () => {
  const location = useLocation();

  useLayoutEffect(() => {
    const focusId = resolveNavigationFocusId(location.state);
    const focusTarget =
      (focusId === undefined ? undefined : document.getElementById(focusId)) ??
      document.querySelector<HTMLElement>("[data-route-heading]");
    focusTarget?.focus({ preventScroll: focusId === undefined });
  }, [location.key, location.state]);

  return null;
};

export const ApplicationFoundation = () => (
  <ApplicationShell
    catalog={
      <div className="support-panel-content">
        <p className="eyebrow">Workspace</p>
        <p className="support-panel-copy">
          Studio and Show navigation will appear here as their workflows are
          added.
        </p>
      </div>
    }
    catalogLabel="Workspace navigation"
    historyActions={
      <>
        <IconButton disabled icon="undo" label="Undo" tooltip="Undo" />
        <IconButton disabled icon="redo" label="Redo" tooltip="Redo" />
      </>
    }
    inspector={
      <div className="support-panel-content">
        <InspectorSection heading="Inspector">
          <p className="support-panel-copy">
            Contextual production settings will stay attached to the workspace.
          </p>
        </InspectorSection>
      </div>
    }
    menu={
      <IconButton
        icon="more"
        label="Application menu"
        tooltip="Application menu"
      />
    }
    notes={
      <NotesPanel
        prompt="Notes remain available without competing with the main workspace."
        readOnly
        value="Production notes will appear here."
      />
    }
    notesLabel="Production notes"
    primaryAction={<Button variant="primary">Create Studio</Button>}
    saveState={<SaveStateIndicator state="saved" />}
    studioSwitcher={
      <Button size="small" trailingIcon="chevron-down" variant="ghost">
        Studio switcher
      </Button>
    }
    title="Showflow is ready."
  >
    <div className="foundation-workspace">
      <section className="status-panel" aria-labelledby="showflow-heading">
        <p className="eyebrow">Secure desktop shell</p>
        <h2 id="showflow-heading">Production workspace foundation</h2>
        <p className="status-detail">
          The persistent shell now keeps navigation, actions, supporting panels,
          and notes organized around one clear main workspace.
        </p>
      </section>
    </div>
  </ApplicationShell>
);

const DesignShowRootRedirect = () => {
  const { studioId, showId } = useParams<{
    studioId: string;
    showId: string;
  }>();

  if (studioId === undefined || showId === undefined) {
    return <Navigate replace to="/" />;
  }

  return <Navigate replace to={getDesignShowRoute(studioId, showId)} />;
};

const AppRoutes = () => (
  <>
    <RouteFocusManager />
    <Routes>
      <Route element={<StartupDestination />} path="/" />
      <Route element={<ComponentGallery />} path={COMPONENT_GALLERY_ROUTE} />
      <Route
        element={<ApplicationFoundation />}
        path={APPLICATION_FOUNDATION_ROUTE}
      />
      <Route element={<StudioCreationPage />} path={STUDIO_CREATION_ROUTE} />
      <Route element={<StudioHomeDestination />} path={STUDIO_HOME_ROUTE} />
      <Route element={<ShowCreationPage />} path={SHOW_CREATION_ROUTE} />
      <Route element={<ShowDetailDestination />} path={SHOW_DETAIL_ROUTE} />
      <Route
        element={<DesignShowRootRedirect />}
        path={DESIGN_SHOW_ROOT_ROUTE}
      />
      <Route element={<DesignShowDestination />} path={DESIGN_SHOW_ROUTE} />
      <Route
        element={<ShowSegmentEditorDestination />}
        path={DESIGN_SHOW_SEGMENT_ROUTE}
      />
      <Route
        element={<LayoutEditorDestination />}
        path={DESIGN_SHOW_LAYOUT_ROUTE}
      />
      <Route element={<EpisodeCreationPage />} path={EPISODE_CREATION_ROUTE} />
      <Route
        element={<ProduceEpisodeDestination />}
        path={PRODUCE_EPISODE_ROUTE}
      />
      <Route
        element={<EpisodeSegmentEditorDestination />}
        path={EPISODE_SEGMENT_ROUTE}
      />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  </>
);

export const App = () => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  );
};
