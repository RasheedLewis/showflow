import { Button, Dialog, Select, TextInput } from "@showflow/ui";
import { useState } from "react";
import type { CreateLayoutRequest, LayoutDto } from "@showflow/contracts";

import styles from "./layouts.module.css";

const PRESETS = [
  {
    id: "blank",
    name: "Blank",
    description: "Start with an empty audience frame.",
  },
  {
    id: "host",
    name: "Host",
    description: "Host camera, logo, and Lower Third regions.",
  },
  {
    id: "hostVideo",
    name: "Host + Video",
    description: "Host beside a featured video region.",
  },
  {
    id: "fullscreenVideo",
    name: "Fullscreen Video",
    description: "One edge-to-edge video region.",
  },
] as const;

interface NewLayoutDialogProps {
  readonly context: CreateLayoutRequest["context"];
  readonly onCreated: (layout: LayoutDto) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

export const NewLayoutDialog = ({
  context,
  onCreated,
  onOpenChange,
  open,
}: NewLayoutDialogProps) => {
  const [presetId, setPresetId] =
    useState<CreateLayoutRequest["presetId"]>("blank");
  const [aspectRatio, setAspectRatio] =
    useState<CreateLayoutRequest["aspectRatio"]>("16:9");
  const [name, setName] = useState("Untitled Layout");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const create = async (): Promise<void> => {
    setSaving(true);
    setError(undefined);
    try {
      const result = await window.showflow.layouts.create({
        context,
        name,
        aspectRatio,
        presetId,
      });
      if (!result.ok) throw new Error(result.error.message);
      onCreated(result.data);
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Showflow could not create the Layout.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      description="Choose a reusable starting composition. You can edit every Slot next."
      footer={
        <>
          <Button
            disabled={saving}
            onClick={() => onOpenChange(false)}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={saving || name.trim().length === 0}
            onClick={() => void create()}
            variant="primary"
          >
            Create Layout
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="New Layout"
    >
      <div className={styles.creationForm}>
        <TextInput
          label="Layout name"
          maxLength={200}
          onChange={(event) => setName(event.currentTarget.value)}
          value={name}
        />
        <Select
          label="Aspect ratio"
          onChange={(event) =>
            setAspectRatio(
              event.currentTarget.value as CreateLayoutRequest["aspectRatio"],
            )
          }
          options={[
            { label: "Landscape · 16:9", value: "16:9" },
            { label: "Portrait · 9:16", value: "9:16" },
          ]}
          value={aspectRatio}
        />
        <fieldset className={styles.presetFieldset}>
          <legend>Starting preset</legend>
          <div className={styles.presetGrid}>
            {PRESETS.map((preset) => (
              <label
                className={styles.presetCard}
                data-selected={preset.id === presetId || undefined}
                key={preset.id}
              >
                <input
                  checked={preset.id === presetId}
                  name="layout-preset"
                  onChange={() => setPresetId(preset.id)}
                  type="radio"
                />
                <strong>{preset.name}</strong>
                <span>{preset.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
};
