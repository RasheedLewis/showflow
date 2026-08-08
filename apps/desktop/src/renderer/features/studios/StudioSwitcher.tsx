import { Button, Menu, MenuItem, MenuLabel, MenuSeparator } from "@showflow/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { StudioDto } from "@showflow/contracts";

import {
  getStudioHomeRoute,
  STUDIO_CREATION_ROUTE,
} from "../../app-routes.mts";
import { loadStudios, studiosQueryKey } from "./studio-queries";
import styles from "./studio-pages.module.css";

export interface StudioSwitcherProps {
  readonly currentStudio: StudioDto;
  readonly onSelectionError: (message: string | undefined) => void;
}

const studioSwitchError =
  "Showflow could not switch Studios. The current Studio remains open. Try again.";

export const StudioSwitcher = ({
  currentStudio,
  onSelectionError,
}: StudioSwitcherProps) => {
  const navigate = useNavigate();
  const [switchingStudioId, setSwitchingStudioId] = useState<string>();
  const studiosQuery = useQuery({
    queryFn: loadStudios,
    queryKey: studiosQueryKey,
  });
  const otherStudios = (studiosQuery.data ?? []).filter(
    (studio) => studio.id !== currentStudio.id,
  );

  const switchStudio = async (studio: StudioDto): Promise<void> => {
    const route = getStudioHomeRoute(studio.id);
    onSelectionError(undefined);
    setSwitchingStudioId(studio.id);

    try {
      const result = await window.showflow.app.updateNavigation({
        lastRoute: route,
        lastStudioId: studio.id,
      });

      if (!result.ok) {
        onSelectionError(studioSwitchError);
        setSwitchingStudioId(undefined);
        return;
      }

      setSwitchingStudioId(undefined);
      navigate(route);
    } catch {
      onSelectionError(studioSwitchError);
      setSwitchingStudioId(undefined);
    }
  };

  return (
    <Menu
      trigger={
        <Button
          aria-label={`Switch Studio. Current Studio: ${currentStudio.name}`}
          className={styles.switcherTrigger}
          size="small"
          trailingIcon="chevron-down"
          variant="ghost"
        >
          {currentStudio.name}
        </Button>
      }
    >
      <MenuLabel>Current Studio</MenuLabel>
      <MenuItem disabled shortcut="Current">
        {currentStudio.name}
      </MenuItem>
      <MenuSeparator />
      <MenuLabel>Other Studios</MenuLabel>
      {studiosQuery.isPending ? (
        <MenuItem disabled>Loading Studios…</MenuItem>
      ) : studiosQuery.isError ? (
        <MenuItem onSelect={() => void studiosQuery.refetch()}>
          Retry loading Studios
        </MenuItem>
      ) : otherStudios.length === 0 ? (
        <MenuItem disabled>No other Studios</MenuItem>
      ) : (
        otherStudios.map((studio) => (
          <MenuItem
            disabled={switchingStudioId !== undefined}
            key={studio.id}
            onSelect={() => void switchStudio(studio)}
          >
            {switchingStudioId === studio.id
              ? `Switching to ${studio.name}…`
              : studio.name}
          </MenuItem>
        ))
      )}
      <MenuSeparator />
      <MenuItem
        onSelect={() =>
          navigate(STUDIO_CREATION_ROUTE, {
            state: {
              openedFromStudioSwitcher: true,
              returnTo: getStudioHomeRoute(currentStudio.id),
            },
          })
        }
      >
        Create Studio
      </MenuItem>
      <MenuItem disabled shortcut="Coming later">
        Studio settings
      </MenuItem>
    </Menu>
  );
};
