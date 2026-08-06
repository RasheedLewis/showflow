import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  ApplicationShell,
  Badge,
  Button,
  Checkbox,
  Dialog,
  Divider,
  Drawer,
  EmptyState,
  Icon,
  IconButton,
  InspectorSection,
  Menu,
  MenuItem,
  MenuSeparator,
  NotesPanel,
  ObjectCard,
  Panel,
  PropertyRow,
  SaveStateIndicator,
  ScopeLabel,
  Select,
  Skeleton,
  StatusBadge,
  StoryboardCard,
  Tabs,
  TextArea,
  TextInput,
  Toggle,
  Tooltip,
  ValidationItem,
} from "@showflow/ui";

import styles from "./component-gallery.module.css";
import type { GalleryComponentName } from "./component-gallery-contract.mts";

interface GalleryExampleProps {
  readonly children: ReactNode;
  readonly description: string;
  readonly name: GalleryComponentName;
  readonly wide?: boolean;
}

const GalleryExample = ({
  children,
  description,
  name,
  wide = false,
}: GalleryExampleProps) => (
  <article
    aria-label={`${name} component example`}
    className={`${styles.example} ${wide ? styles.exampleWide : ""}`}
    data-component={name}
  >
    <header className={styles.exampleHeader}>
      <p className={styles.exampleTitle}>{name}</p>
      <p className={styles.exampleDescription}>{description}</p>
    </header>
    <div className={styles.stage}>{children}</div>
  </article>
);

interface GallerySectionProps {
  readonly children: ReactNode;
  readonly description: string;
  readonly id: string;
  readonly title: string;
}

const GallerySection = ({
  children,
  description,
  id,
  title,
}: GallerySectionProps) => (
  <section aria-labelledby={`${id}-heading`} className={styles.section} id={id}>
    <header className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle} id={`${id}-heading`}>
        {title}
      </h2>
      <p className={styles.sectionDescription}>{description}</p>
    </header>
    {children}
  </section>
);

const PreviewPlaceholder = ({ children }: { readonly children: ReactNode }) => (
  <div className={styles.preview}>{children}</div>
);

export const ComponentGallery = () => {
  const navigate = useNavigate();
  const [safeAreas, setSafeAreas] = useState(true);
  const [notes, setNotes] = useState(
    "Introduce the guest after the opening video and confirm the next Segment.",
  );

  return (
    <div className={styles.shellHost} data-component="ApplicationShell">
      <ApplicationShell
        breadcrumb={<span>Development</span>}
        primaryAction={
          <Button onClick={() => navigate("/")} variant="primary">
            Return to app
          </Button>
        }
        saveState={<SaveStateIndicator state="saved" />}
        studioSwitcher={<Badge tone="accent">Internal</Badge>}
        title="Component development gallery"
        wordmark="Showflow UI"
      >
        <div className={styles.gallery}>
          <Panel
            actions={<Badge tone="success">28 components</Badge>}
            className={styles.galleryIntro}
            heading="Sprint 3 design-system acceptance surface"
          >
            <p className={styles.introCopy}>
              Live controls below cover default, hover-triggerable, focused,
              disabled, validation, dark-context, and long-label behavior. Use
              Tab and Shift+Tab to inspect the real keyboard path.
            </p>
          </Panel>

          <GallerySection
            description="Semantic actions, approved variants, icon treatment, and supporting layout surfaces."
            id="gallery-actions"
            title="Actions and layout"
          >
            <div className={styles.exampleGrid}>
              <GalleryExample
                description="All variants, compact and large sizing, disabled treatment, focus, and a long production label."
                name="Button"
                wide
              >
                <div className={styles.stageRow}>
                  <Button variant="primary">Add Segment</Button>
                  <Button variant="secondary">Preview</Button>
                  <Button variant="ghost">Cancel</Button>
                  <Button variant="destructive">Remove</Button>
                  <Button disabled>Disabled</Button>
                  <Button data-gallery-focus="true">Keyboard focus</Button>
                  <Button size="small">Small target</Button>
                  <Button size="large">Start Rehearsal</Button>
                  <Button leadingIcon="plus" variant="primary">
                    Add the selected reusable Segment to this Episode Storyboard
                  </Button>
                </div>
              </GalleryExample>

              <GalleryExample
                description="Labelled and tooltip-backed icon actions in default, focused, and disabled states."
                name="IconButton"
              >
                <div className={styles.stageRow}>
                  <IconButton
                    icon="search"
                    label="Search Catalog"
                    tooltip="Search Catalog"
                  />
                  <IconButton
                    data-gallery-focus="true"
                    icon="more"
                    label="Focused actions"
                    tooltip="Focused actions"
                  />
                  <IconButton
                    disabled
                    icon="trash"
                    label="Remove Segment"
                    tooltip="Remove Segment"
                  />
                </div>
              </GalleryExample>

              <GalleryExample
                description="Decorative and explicitly labelled semantic glyphs from the approved adapter."
                name="Icon"
              >
                <div className={styles.stageRow}>
                  <Icon name="check" size={24} />
                  <Icon label="Information" name="info" size={24} />
                  <Icon label="Blocking issue" name="alert-circle" size={24} />
                </div>
              </GalleryExample>

              <GalleryExample
                description="Quiet supporting surface with a semantic heading and action area."
                name="Panel"
              >
                <Panel
                  actions={<Button size="small">Review</Button>}
                  heading="Validation"
                >
                  <p className={styles.stageCopy}>No blocking issues.</p>
                </Panel>
              </GalleryExample>

              <GalleryExample
                description="Horizontal and vertical semantic separators."
                name="Divider"
              >
                <div className={styles.stageColumn}>
                  <span>Blueprint</span>
                  <Divider />
                  <div className={styles.stageRow}>
                    <span>Show</span>
                    <Divider
                      className={styles.verticalDivider}
                      orientation="vertical"
                    />
                    <span>Episode</span>
                  </div>
                </div>
              </GalleryExample>
            </div>
          </GallerySection>

          <GallerySection
            description="Labelled native controls with help, error, disabled, focus, and long-content states."
            id="gallery-inputs"
            title="Inputs"
          >
            <div className={styles.exampleGrid}>
              <GalleryExample
                description="Default, forced focus, error, disabled, and long-value states."
                name="TextInput"
                wide
              >
                <div className={styles.inputGrid}>
                  <TextInput label="Segment name" value="Interview" readOnly />
                  <TextInput
                    data-gallery-focus="true"
                    label="Focused field"
                    value="Opening"
                    readOnly
                  />
                  <TextInput
                    error="Enter a Segment name before previewing."
                    label="Invalid Segment name"
                    value=""
                    readOnly
                  />
                  <TextInput
                    disabled
                    label="Disabled field"
                    readOnly
                    value="Locked"
                  />
                  <TextInput
                    label="Long production value"
                    value="A deliberately long reusable Segment name that must remain readable without clipping"
                    readOnly
                  />
                </div>
              </GalleryExample>

              <GalleryExample
                description="Help, validation, and disabled multiline states."
                name="TextArea"
              >
                <div className={styles.stageColumn}>
                  <TextArea
                    helpText="Visible to the host during rehearsal."
                    label="Host notes"
                    value="Welcome viewers and introduce the guest."
                    readOnly
                  />
                  <TextArea
                    error="Add a recovery note."
                    label="Recovery note"
                    value=""
                    readOnly
                  />
                  <TextArea
                    disabled
                    label="Disabled notes"
                    readOnly
                    value="Locked"
                  />
                </div>
              </GalleryExample>

              <GalleryExample
                description="Native selection with placeholder, chosen, and disabled states."
                name="Select"
              >
                <div className={styles.stageColumn}>
                  <Select
                    defaultValue="host-video"
                    label="Default Layout"
                    options={[
                      { label: "Full Frame", value: "full-frame" },
                      { label: "Host + Video", value: "host-video" },
                    ]}
                  />
                  <Select
                    defaultValue="full-frame"
                    disabled
                    label="Disabled Layout"
                    options={[{ label: "Full Frame", value: "full-frame" }]}
                  />
                  <Select
                    error="Choose a Layout before previewing."
                    label="Invalid Layout"
                    options={[{ label: "Full Frame", value: "full-frame" }]}
                    placeholder="Choose a Layout"
                  />
                </div>
              </GalleryExample>

              <GalleryExample
                description="Native checked, unchecked, and disabled states with a full labelled target."
                name="Checkbox"
              >
                <div className={styles.stageColumn}>
                  <Checkbox defaultChecked label="Include in Show Blueprint" />
                  <Checkbox label="Allow Episode override" />
                  <Checkbox disabled label="Locked by Show default" />
                </div>
              </GalleryExample>

              <GalleryExample
                description="Controlled switch with on, off, focus, and disabled behavior."
                name="Toggle"
              >
                <div className={styles.stageColumn}>
                  <Toggle
                    checked={safeAreas}
                    label="Safe areas"
                    onCheckedChange={setSafeAreas}
                  />
                  <Toggle
                    checked={false}
                    data-gallery-focus="true"
                    label="Focused overlay guides"
                  />
                  <Toggle checked={false} disabled label="Disabled guide" />
                </div>
              </GalleryExample>
            </div>
          </GallerySection>

          <GallerySection
            description="Arrow-key navigation and Radix-backed overlays with Escape, focus trapping, and restoration."
            id="gallery-navigation"
            title="Navigation and overlays"
          >
            <div className={styles.exampleGrid}>
              <GalleryExample
                description="Arrow-key workspace navigation, disabled state, and long-label stress case."
                name="Tabs"
                wide
              >
                <Tabs
                  defaultValue="storyboard"
                  items={[
                    {
                      content: (
                        <p className={styles.stageCopy}>Storyboard content</p>
                      ),
                      label: "Storyboard",
                      value: "storyboard",
                    },
                    {
                      content: (
                        <p className={styles.stageCopy}>Segments content</p>
                      ),
                      label:
                        "Reusable Segments with a deliberately long navigation label",
                      value: "segments",
                    },
                    {
                      content: "Resources content",
                      disabled: true,
                      label: "Resources",
                      value: "resources",
                    },
                  ]}
                  label="Gallery workspace"
                />
              </GalleryExample>

              <GalleryExample
                description="Keyboard and pointer tooltip from a labelled trigger."
                name="Tooltip"
              >
                <Tooltip content="Search the Segment Catalog" delayDuration={0}>
                  <Button leadingIcon="search">Search</Button>
                </Tooltip>
              </GalleryExample>

              <GalleryExample
                description="Named action menu with shortcut display, grouping, disabled, and destructive items."
                name="Menu"
              >
                <Menu
                  trigger={
                    <Button trailingIcon="chevron-down">Segment actions</Button>
                  }
                >
                  <MenuItem shortcut="⌘D">Duplicate Segment</MenuItem>
                  <MenuItem disabled>Archive unavailable</MenuItem>
                  <MenuSeparator />
                  <MenuItem destructive>Remove Segment</MenuItem>
                </Menu>
              </GalleryExample>

              <GalleryExample
                description="Modal focus trap, descriptive copy, Escape close, and opener restoration."
                name="Dialog"
              >
                <Dialog
                  description="Confirm a change to this reusable Show Segment."
                  footer={
                    <>
                      <Button variant="ghost">Cancel</Button>
                      <Button variant="primary">Confirm change</Button>
                    </>
                  }
                  title="Update reusable Segment"
                  trigger={<Button>Open dialog</Button>}
                >
                  This change affects future uses of the Segment.
                </Dialog>
              </GalleryExample>

              <GalleryExample
                description="Side overlay with long production-language title and the same focus contract as Dialog."
                name="Drawer"
              >
                <Drawer
                  description="Choose reusable production content for the current Storyboard position."
                  title="Add a reusable Segment from the Show Catalog"
                  trigger={<Button>Open drawer</Button>}
                >
                  <p className={styles.stageCopy}>
                    Opening · Interview · Close
                  </p>
                </Drawer>
              </GalleryExample>
            </div>
          </GallerySection>

          <GallerySection
            description="Loading, empty, save, status, dark-context, and non-color communication states."
            id="gallery-feedback"
            title="Feedback and contexts"
          >
            <div className={styles.exampleGrid}>
              <GalleryExample
                description="Neutral, accent, and every semantic tone with visible labels."
                name="Badge"
                wide
              >
                <div className={styles.stageRow}>
                  <Badge>Neutral</Badge>
                  <Badge tone="accent">Selected</Badge>
                  <Badge icon="check" tone="success">
                    Ready
                  </Badge>
                  <Badge icon="alert-circle" tone="warning">
                    Warning
                  </Badge>
                  <Badge icon="alert-circle" tone="error">
                    Blocking
                  </Badge>
                  <Badge icon="info" tone="info">
                    Information
                  </Badge>
                </div>
              </GalleryExample>

              <GalleryExample
                description="Labelled indeterminate loading state; pulsing stops under reduced motion."
                name="Skeleton"
              >
                <div className={styles.stageColumn}>
                  <Skeleton label="Loading Segment Catalog" />
                  <Skeleton label="Loading Storyboard" />
                </div>
              </GalleryExample>

              <GalleryExample
                description="One primary action, optional secondary action, and production-language guidance."
                name="EmptyState"
                wide
              >
                <EmptyState
                  action={<Button variant="primary">Add First Segment</Button>}
                  description="Add reusable Segments in the order they usually occur."
                  heading="Design your Show's default Storyboard"
                  icon="plus"
                  secondaryAction={<Button variant="ghost">Learn more</Button>}
                />
              </GalleryExample>

              <GalleryExample
                description="Every autosave state with text and a non-color mark."
                name="SaveStateIndicator"
              >
                <div className={styles.stageColumn}>
                  <SaveStateIndicator state="saving" />
                  <SaveStateIndicator state="saved" />
                  <SaveStateIndicator state="unsaved" />
                  <SaveStateIndicator state="error" />
                </div>
              </GalleryExample>
            </div>

            <section
              aria-labelledby="dark-contexts-heading"
              className={styles.contextSection}
            >
              <h3 className={styles.contextHeading} id="dark-contexts-heading">
                Dark background contexts
              </h3>
              <div className={styles.surfaceGrid}>
                {[
                  [styles.surfaceCanvas, "Canvas"],
                  [styles.surfaceBase, "Base"],
                  [styles.surfacePanel, "Panel"],
                  [styles.surfaceCard, "Card"],
                  [styles.surfaceElevated, "Elevated"],
                ].map(([surfaceClass, label]) => (
                  <div
                    className={`${styles.surface} ${surfaceClass}`}
                    key={label}
                  >
                    <span className={styles.surfaceLabel}>{label}</span>
                    <Button size="small">Inspect contrast</Button>
                  </div>
                ))}
              </div>
            </section>
          </GallerySection>

          <GallerySection
            description="Reusable production-object anatomy, selection, readiness, scope, notes, inspector, and validation."
            id="gallery-production"
            title="Production object primitives"
          >
            <div className={styles.exampleGrid}>
              <GalleryExample
                description="Default, selected, focused, dragging, disabled, invalid, archived, current, actions, and long-title states."
                name="ObjectCard"
                wide
              >
                <div className={styles.cardGrid}>
                  <ObjectCard
                    actions={
                      <IconButton
                        icon="more"
                        label="Opening actions"
                        tooltip="Opening actions"
                      />
                    }
                    description="Reusable opening sequence"
                    metadata={<span>Used in 4 Episodes</span>}
                    onOpen={() => undefined}
                    preview={
                      <PreviewPlaceholder>Opening preview</PreviewPlaceholder>
                    }
                    status={<StatusBadge status="ready" />}
                    title="Opening"
                  />
                  <ObjectCard
                    data-gallery-focus="true"
                    description="Forced keyboard-focus reference"
                    onOpen={() => undefined}
                    selected
                    title="Selected and focused"
                  />
                  <ObjectCard dragging title="Dragging" />
                  <ObjectCard
                    disabled
                    onOpen={() => undefined}
                    title="Disabled"
                  />
                  <ObjectCard invalid title="Invalid" />
                  <ObjectCard archived title="Archived" />
                  <ObjectCard current title="Current" />
                  <ObjectCard
                    description="Long content must wrap without hiding production context."
                    title="A deliberately long reusable Segment title that remains legible in the Catalog"
                  />
                </div>
              </GalleryExample>

              <GalleryExample
                description="Storyboard position, timing, reuse, readiness, Current/Next, warning, and blocking states."
                name="StoryboardCard"
                wide
              >
                <div className={styles.storyboardGrid}>
                  <StoryboardCard
                    duration="01:30"
                    preview={
                      <PreviewPlaceholder>Audience preview</PreviewPlaceholder>
                    }
                    readiness="ready"
                    sequenceNumber={1}
                    summary="Welcome and opening sequence"
                    timelineState="current"
                    title="Opening"
                  />
                  <StoryboardCard
                    duration="08:00"
                    issueCount={2}
                    placementLabel="Guest discussion"
                    preview={
                      <PreviewPlaceholder>Interview preview</PreviewPlaceholder>
                    }
                    readiness="has-warnings"
                    reuseCount={2}
                    sequenceNumber={2}
                    summary="Guest: Jane Doe"
                    timelineState="next"
                    title="Interview"
                  />
                  <StoryboardCard
                    duration="02:00"
                    issueCount={1}
                    preview={
                      <PreviewPlaceholder>Missing artwork</PreviewPlaceholder>
                    }
                    readiness="blocking-issue"
                    sequenceNumber={3}
                    title="Ranking Reveal"
                  />
                </div>
              </GalleryExample>

              <GalleryExample
                description="All canonical readiness labels with icon and text reinforcement."
                name="StatusBadge"
              >
                <div className={styles.stageColumn}>
                  <StatusBadge status="ready" />
                  <StatusBadge status="needs-content" />
                  <StatusBadge status="has-warnings" />
                  <StatusBadge status="blocking-issue" />
                </div>
              </GalleryExample>

              <GalleryExample
                description="Canonical Show, Episode, Show Segment, and Episode Segment ownership copy."
                name="ScopeLabel"
              >
                <div className={styles.stageColumn}>
                  <ScopeLabel scope="show" />
                  <ScopeLabel scope="episode" />
                  <ScopeLabel scope="show-segment" />
                  <ScopeLabel scope="episode-segment" />
                </div>
              </GalleryExample>

              <GalleryExample
                description="Quiet labelled grouping for contextual production settings."
                name="InspectorSection"
              >
                <InspectorSection
                  actions={<Button size="small">Reset</Button>}
                  description="Current Segment settings"
                  heading="Content"
                >
                  <p className={styles.stageCopy}>
                    Default Layout · Host + Video
                  </p>
                </InspectorSection>
              </GalleryExample>

              <GalleryExample
                description="Property, source, Episode override, reset action, and labelled control."
                name="PropertyRow"
                wide
              >
                <PropertyRow
                  control={
                    <TextInput label="Duration value" value="01:30" readOnly />
                  }
                  description="Expected time for this Segment."
                  label="Duration"
                  overridden
                  resetAction={
                    <Button size="small">Reset to Show default</Button>
                  }
                  source="Show default"
                />
              </GalleryExample>

              <GalleryExample
                description="Editable, readable production notebook with prompt and long host copy."
                name="NotesPanel"
                wide
              >
                <NotesPanel
                  onChange={(event) => setNotes(event.currentTarget.value)}
                  prompt="Notes begin from the Show Segment template."
                  value={notes}
                />
              </GalleryExample>

              <GalleryExample
                description="Warning and blocking severity, affected object, actionable copy, and direct resolution."
                name="ValidationItem"
                wide
              >
                <div className={styles.validationStack}>
                  <ValidationItem
                    action={<Button size="small">Review timing</Button>}
                    affectedObject="Interview · Expected duration"
                    message="The Interview Segment is longer than its Blueprint target."
                    severity="warning"
                  />
                  <ValidationItem
                    action={<Button size="small">Add artwork</Button>}
                    affectedObject="Ranking Reveal · Album artwork"
                    message="The Ranking Reveal Segment needs album artwork before preview."
                    severity="blocking"
                  />
                </div>
              </GalleryExample>
            </div>
          </GallerySection>
        </div>
      </ApplicationShell>
    </div>
  );
};
