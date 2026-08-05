export const App = () => (
  <div className="app-shell">
    <header className="app-bar" aria-label="Showflow application">
      <span className="wordmark">Showflow</span>
      <span className="app-bar-context">Desktop foundation</span>
    </header>

    <main className="app-content">
      <section className="status-panel" aria-labelledby="showflow-heading">
        <p className="eyebrow">Secure desktop shell</p>
        <h1 id="showflow-heading">Showflow is ready.</h1>
        <p className="status-detail">
          The production workspace foundation is running with Electron, Vite,
          and React.
        </p>
      </section>
    </main>
  </div>
);
