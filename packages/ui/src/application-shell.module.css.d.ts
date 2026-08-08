type ApplicationShellClassName =
  | "actionArea"
  | "applicationShell"
  | "catalogPanel"
  | "contextArea"
  | "contextAreaWithParent"
  | "historyActions"
  | "identityArea"
  | "inspectorPanel"
  | "mainContent"
  | "notesArea"
  | "pageTitle"
  | "panelClose"
  | "panelScrim"
  | "parentNavigation"
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
