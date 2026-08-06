import {
  ApplicationShell,
  Button,
  IconButton,
  InspectorSection,
  NotesPanel,
  SaveStateIndicator,
} from "@showflow/ui";
import { Route, Routes } from "react-router-dom";

import { ComponentGallery } from "./development/ComponentGallery";
import { COMPONENT_GALLERY_ROUTE } from "./development/component-gallery-contract.mts";

export const ApplicationFoundation = () => (
  <ApplicationShell
    breadcrumb={<span>Desktop foundation</span>}
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

export const App = () => (
  <Routes>
    <Route element={<ComponentGallery />} path={COMPONENT_GALLERY_ROUTE} />
    <Route element={<ApplicationFoundation />} path="*" />
  </Routes>
);
