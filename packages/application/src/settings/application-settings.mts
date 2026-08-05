export interface WindowPreferences {
  readonly height: number;
  readonly isMaximized: boolean;
  readonly width: number;
}

export interface ApplicationSettings {
  readonly lastRoute: string;
  readonly lastStudioId: string | null;
  readonly windowPreferences: WindowPreferences | null;
}

export interface UpdateNavigationSettings {
  readonly lastRoute: string;
  readonly lastStudioId: string | null;
}

export interface ApplicationSettingsRepository {
  get(): Promise<ApplicationSettings>;
  updateNavigation(
    navigation: UpdateNavigationSettings,
  ): Promise<ApplicationSettings>;
  updateWindowPreferences(
    windowPreferences: WindowPreferences,
  ): Promise<ApplicationSettings>;
}

export class ApplicationSettingsService {
  readonly #repository: ApplicationSettingsRepository;

  constructor(repository: ApplicationSettingsRepository) {
    this.#repository = repository;
  }

  get(): Promise<ApplicationSettings> {
    return this.#repository.get();
  }

  updateNavigation(
    navigation: UpdateNavigationSettings,
  ): Promise<ApplicationSettings> {
    return this.#repository.updateNavigation(navigation);
  }

  updateWindowPreferences(
    windowPreferences: WindowPreferences,
  ): Promise<ApplicationSettings> {
    return this.#repository.updateWindowPreferences(windowPreferences);
  }
}
