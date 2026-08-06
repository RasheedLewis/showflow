import {
  Button,
  Dialog,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  ObjectCard,
  TextInput,
} from "@showflow/ui";
import { useState, type FormEvent } from "react";

import type { ShowCardDto, ShowDto } from "@showflow/contracts";

import styles from "./show-card.module.css";

interface ShowCardProps {
  readonly card: ShowCardDto;
  readonly onArchive: (show: ShowDto) => Promise<void>;
  readonly onDelete: (show: ShowDto) => Promise<void>;
  readonly onOpen: (show: ShowDto) => void;
  readonly onRename: (show: ShowDto, name: string) => Promise<void>;
}

const formatLastEdited = (value: string): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );

export const ShowCard = ({
  card,
  onArchive,
  onDelete,
  onOpen,
  onRename,
}: ShowCardProps) => {
  const { show } = card;
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameName, setRenameName] = useState(show.name);
  const [nameError, setNameError] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);

  const run = async (operation: () => Promise<void>): Promise<boolean> => {
    setRequestError(undefined);
    setIsBusy(true);
    try {
      await operation();
      return true;
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "Showflow could not update this Show. Try again.",
      );
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const handleRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = renameName.trim();
    if (normalizedName.length === 0) {
      setNameError("Enter a Show name.");
      return;
    }
    setNameError(undefined);
    if (await run(() => onRename(show, normalizedName))) {
      setRenameOpen(false);
    }
  };

  return (
    <>
      <ObjectCard
        actions={
          <Menu
            trigger={
              <IconButton
                icon="more"
                label={`Actions for ${show.name}`}
                size="small"
                tooltip={`Actions for ${show.name}`}
              />
            }
          >
            <MenuItem onSelect={() => onOpen(show)}>Open</MenuItem>
            <MenuItem
              onSelect={() => {
                setRenameName(show.name);
                setRequestError(undefined);
                setRenameOpen(true);
              }}
            >
              Rename
            </MenuItem>
            <MenuItem
              disabled={isBusy}
              onSelect={() => void run(() => onArchive(show))}
            >
              Archive
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              destructive
              disabled={isBusy}
              onSelect={() => {
                setRequestError(undefined);
                setDeleteOpen(true);
              }}
            >
              Delete
            </MenuItem>
          </Menu>
        }
        {...(show.description === null
          ? {}
          : { description: show.description })}
        metadata={
          <>
            <span>
              {card.episodeCount}{" "}
              {card.episodeCount === 1 ? "Episode" : "Episodes"}
            </span>
            <span>Edited {formatLastEdited(show.updatedAt)}</span>
          </>
        }
        onOpen={() => onOpen(show)}
        preview={
          <div
            aria-label={`${show.name} thumbnail placeholder`}
            className={styles.thumbnail}
            role="img"
          >
            <span aria-hidden="true">
              {show.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        }
        title={show.name}
      />
      {requestError && !renameOpen && !deleteOpen ? (
        <p className={styles.cardError} role="alert">
          {requestError}
        </p>
      ) : null}
      <Dialog
        description="Update the name shown on Studio Home and throughout this Show."
        footer={
          <>
            <Button disabled={isBusy} onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isBusy}
              form={`rename-${show.id}`}
              type="submit"
              variant="primary"
            >
              {isBusy ? "Renaming…" : "Rename Show"}
            </Button>
          </>
        }
        onOpenChange={setRenameOpen}
        open={renameOpen}
        title={`Rename ${show.name}`}
      >
        <form
          id={`rename-${show.id}`}
          noValidate
          onSubmit={(event) => void handleRename(event)}
        >
          <TextInput
            autoFocus
            {...(nameError === undefined ? {} : { error: nameError })}
            label="Show name"
            maxLength={200}
            onChange={(event) => {
              setRenameName(event.currentTarget.value);
              if (nameError !== undefined) setNameError(undefined);
            }}
            required
            value={renameName}
          />
          {requestError ? (
            <p className={styles.dialogError} role="alert">
              {requestError}
            </p>
          ) : null}
        </form>
      </Dialog>
      <Dialog
        description={`Permanently delete ${show.name} and its Show Blueprint. This cannot be undone.`}
        footer={
          <>
            <Button disabled={isBusy} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isBusy}
              onClick={() => {
                void run(() => onDelete(show)).then((deleted) => {
                  if (deleted) setDeleteOpen(false);
                });
              }}
              variant="destructive"
            >
              {isBusy ? "Deleting…" : "Delete Show"}
            </Button>
          </>
        }
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title={`Delete ${show.name}?`}
      >
        <p className={styles.dialogCopy}>
          This Show currently has {card.episodeCount} Episodes. Showflow will
          remove the Show from this Studio.
        </p>
        {requestError ? (
          <p className={styles.dialogError} role="alert">
            {requestError}
          </p>
        ) : null}
      </Dialog>
    </>
  );
};
