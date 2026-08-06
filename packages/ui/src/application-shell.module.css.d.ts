type ApplicationShellClassName =
  | "actionArea"
  | "applicationShell"
  | "breadcrumb"
  | "catalogPanel"
  | "contextArea"
  | "historyActions"
  | "identityArea"
  | "inspectorPanel"
  | "mainContent"
  | "notesArea"
  | "pageTitle"
  | "panelClose"
  | "panelScrim"
  | "primaryAction"
  | "saveState"
  | "scopeArea"
  | "skipLink"
  | "studioSwitcher"
  | "topBar"
  | "wordmark"
  | "workspace";

declare const styles: Readonly<Record<ApplicationShellClassName, string>>;

export default styles;
