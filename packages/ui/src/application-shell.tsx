import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import { classNames } from "./class-names.js";
import { IconButton } from "./controls.js";
import styles from "./application-shell.module.css";

export interface ApplicationShellProps {
  readonly breadcrumb?: ReactNode;
  readonly catalog?: ReactNode;
  readonly catalogLabel?: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly defaultCatalogOpen?: boolean;
  readonly defaultInspectorOpen?: boolean;
  readonly historyActions?: ReactNode;
  readonly inspector?: ReactNode;
  readonly inspectorLabel?: string;
  readonly menu?: ReactNode;
  readonly notes?: ReactNode;
  readonly notesLabel?: string;
  readonly primaryAction: ReactNode;
  readonly saveState?: ReactNode;
  readonly scope?: ReactNode;
  readonly studioSwitcher: ReactNode;
  readonly title: string;
  readonly wordmark?: string;
}

export const ApplicationShell = ({
  breadcrumb,
  catalog,
  catalogLabel = "Catalog",
  children,
  className,
  defaultCatalogOpen = false,
  defaultInspectorOpen = true,
  historyActions,
  inspector,
  inspectorLabel = "Inspector",
  menu,
  notes,
  notesLabel = "Notes",
  primaryAction,
  saveState,
  scope,
  studioSwitcher,
  title,
  wordmark = "Showflow",
}: ApplicationShellProps) => {
  const hasCatalog = catalog !== null && catalog !== undefined;
  const hasInspector = inspector !== null && inspector !== undefined;
  const mainId = `sf-main-${useId().replaceAll(":", "")}`;
  const [catalogOpen, setCatalogOpen] = useState(
    hasCatalog && defaultCatalogOpen,
  );
  const [inspectorOpen, setInspectorOpen] = useState(
    hasInspector && defaultInspectorOpen,
  );
  const catalogTrigger = useRef<HTMLButtonElement>(null);
  const inspectorTrigger = useRef<HTMLButtonElement>(null);

  const closeCatalog = (restoreFocus = true): void => {
    setCatalogOpen(false);
    if (restoreFocus) catalogTrigger.current?.focus();
  };

  const closeInspector = (restoreFocus = true): void => {
    setInspectorOpen(false);
    if (restoreFocus) inspectorTrigger.current?.focus();
  };

  useEffect(() => {
    if (!catalogOpen && !inspectorOpen) return undefined;

    const closePanel = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || event.defaultPrevented) return;

      if (catalogOpen) {
        setCatalogOpen(false);
        catalogTrigger.current?.focus();
      } else if (inspectorOpen) {
        setInspectorOpen(false);
        inspectorTrigger.current?.focus();
      }
    };

    window.addEventListener("keydown", closePanel);
    return () => window.removeEventListener("keydown", closePanel);
  }, [catalogOpen, inspectorOpen]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;

    const narrowDesktop = window.matchMedia("(max-width: 1279px)");
    const collapseForViewport = (): void => {
      if (!narrowDesktop.matches) return;

      setCatalogOpen(false);
      setInspectorOpen(false);
    };

    collapseForViewport();
    narrowDesktop.addEventListener("change", collapseForViewport);

    return () => {
      narrowDesktop.removeEventListener("change", collapseForViewport);
    };
  }, []);

  const toggleCatalog = (): void => {
    const nextOpen = !catalogOpen;
    setCatalogOpen(nextOpen);
    if (nextOpen) setInspectorOpen(false);
  };

  const toggleInspector = (): void => {
    const nextOpen = !inspectorOpen;
    setInspectorOpen(nextOpen);
    if (nextOpen) setCatalogOpen(false);
  };

  return (
    <div
      className={classNames(styles.applicationShell, className)}
      data-catalog-open={catalogOpen || undefined}
      data-inspector-open={inspectorOpen || undefined}
    >
      <a
        className={styles.skipLink}
        href={`#${mainId}`}
        onClick={(event) => {
          event.preventDefault();
          document.getElementById(mainId)?.focus();
        }}
      >
        Skip to workspace
      </a>

      <header aria-label="Showflow application" className={styles.topBar}>
        <div className={styles.identityArea}>
          <span className={styles.wordmark}>{wordmark}</span>
          <div className={styles.studioSwitcher}>{studioSwitcher}</div>
        </div>

        <div className={styles.contextArea}>
          {breadcrumb ? (
            <div className={styles.breadcrumb}>{breadcrumb}</div>
          ) : null}
          <h1 className={styles.pageTitle}>{title}</h1>
        </div>

        <div className={styles.actionArea}>
          {saveState ? (
            <div className={styles.saveState}>{saveState}</div>
          ) : null}
          {historyActions ? (
            <div className={styles.historyActions}>{historyActions}</div>
          ) : null}
          {hasCatalog ? (
            <IconButton
              aria-expanded={catalogOpen}
              icon="panel-left"
              label={
                catalogOpen ? `Close ${catalogLabel}` : `Open ${catalogLabel}`
              }
              onClick={toggleCatalog}
              ref={catalogTrigger}
              tooltip={
                catalogOpen ? `Close ${catalogLabel}` : `Open ${catalogLabel}`
              }
            />
          ) : null}
          {hasInspector ? (
            <IconButton
              aria-expanded={inspectorOpen}
              icon="panel-right"
              label={
                inspectorOpen
                  ? `Hide ${inspectorLabel}`
                  : `Show ${inspectorLabel}`
              }
              onClick={toggleInspector}
              ref={inspectorTrigger}
              tooltip={
                inspectorOpen
                  ? `Hide ${inspectorLabel}`
                  : `Show ${inspectorLabel}`
              }
            />
          ) : null}
          <div className={styles.primaryAction}>{primaryAction}</div>
          {menu}
        </div>
      </header>

      {scope ? <div className={styles.scopeArea}>{scope}</div> : null}

      <div className={styles.workspace}>
        {hasCatalog && catalogOpen ? (
          <aside aria-label={catalogLabel} className={styles.catalogPanel}>
            <div className={styles.panelClose}>
              <IconButton
                icon="close"
                label={`Close ${catalogLabel}`}
                onClick={() => closeCatalog()}
                tooltip={`Close ${catalogLabel}`}
              />
            </div>
            {catalog}
          </aside>
        ) : null}

        <main
          aria-label={title}
          className={styles.mainContent}
          id={mainId}
          tabIndex={-1}
        >
          {children}
        </main>

        {hasInspector && inspectorOpen ? (
          <aside aria-label={inspectorLabel} className={styles.inspectorPanel}>
            <div className={styles.panelClose}>
              <IconButton
                icon="close"
                label={`Close ${inspectorLabel}`}
                onClick={() => closeInspector()}
                tooltip={`Close ${inspectorLabel}`}
              />
            </div>
            {inspector}
          </aside>
        ) : null}

        {notes ? (
          <section aria-label={notesLabel} className={styles.notesArea}>
            {notes}
          </section>
        ) : null}

        {(catalogOpen || inspectorOpen) && (hasCatalog || hasInspector) ? (
          <button
            aria-label="Close support panel"
            className={styles.panelScrim}
            onClick={() => {
              if (catalogOpen) closeCatalog();
              else closeInspector();
            }}
            type="button"
          />
        ) : null}
      </div>
    </div>
  );
};
