import { Button, Checkbox, Select, TextInput } from "@showflow/ui";
import { useState } from "react";
import type {
  BindingDto,
  ComponentDto,
  ComponentPlacementDto,
  ResourceContext,
  ResourceDto,
} from "@showflow/contracts";
import { LOWER_THIRD_STYLE_PRESETS } from "@showflow/domain";
import {
  ANIMATION_PRESET_OPTIONS,
  type AnimationConfig,
} from "@showflow/execution-contracts";

import { ResourcePicker } from "../resources/ResourcePicker";
import styles from "./placement-inspector.module.css";

const compatibleCategory = (
  type: ComponentDto["propertySchema"][number]["type"],
) =>
  type === "imageResource"
    ? "image"
    : type === "videoResource"
      ? "video"
      : type === "audioResource"
        ? "audio"
        : type === "cameraResource"
          ? "cameraInput"
          : undefined;

const initialBinding = (
  property: ComponentDto["propertySchema"][number],
): BindingDto => ({
  kind: "literal",
  value: property.defaultValue ?? (property.type === "boolean" ? false : ""),
});

const EASING_OPTIONS = [
  { label: "Standard", value: "cubic-bezier(0.2, 0, 0, 1)" },
  { label: "Enter", value: "cubic-bezier(0, 0, 0.2, 1)" },
  { label: "Exit", value: "cubic-bezier(0.4, 0, 1, 1)" },
  { label: "Linear", value: "linear" },
] as const;

const AnimationControls = ({
  configuration,
  defaultConfiguration,
  label,
  onChange,
}: {
  readonly configuration: AnimationConfig | null;
  readonly defaultConfiguration: AnimationConfig;
  readonly label: "Enter" | "Exit";
  readonly onChange: (configuration: AnimationConfig | null) => void;
}) => (
  <section className={styles["animation"]}>
    <strong>{label} animation</strong>
    <Select
      label={`${label} animation source`}
      onChange={(event) =>
        onChange(
          event.currentTarget.value === "default"
            ? null
            : { ...defaultConfiguration },
        )
      }
      options={[
        { label: "Use Component default", value: "default" },
        { label: "Override for this Placement", value: "override" },
      ]}
      value={configuration === null ? "default" : "override"}
    />
    {configuration === null ? (
      <p>
        {ANIMATION_PRESET_OPTIONS.find(
          ({ value }) => value === defaultConfiguration.preset,
        )?.label ?? "None"}{" "}
        · {defaultConfiguration.durationMs} ms
      </p>
    ) : (
      <>
        <Select
          label={`${label} preset`}
          onChange={(event) =>
            onChange({
              ...configuration,
              preset: event.currentTarget.value as AnimationConfig["preset"],
            })
          }
          options={ANIMATION_PRESET_OPTIONS}
          value={configuration.preset}
        />
        <TextInput
          label={`${label} duration in milliseconds`}
          min={0}
          onChange={(event) => {
            const durationMs = Number(event.currentTarget.value);
            if (Number.isInteger(durationMs) && durationMs >= 0)
              onChange({ ...configuration, durationMs });
          }}
          step={10}
          type="number"
          value={configuration.durationMs}
        />
        <TextInput
          label={`${label} delay in milliseconds`}
          min={0}
          onChange={(event) => {
            const delayMs = Number(event.currentTarget.value);
            if (Number.isInteger(delayMs) && delayMs >= 0)
              onChange({ ...configuration, delayMs });
          }}
          step={10}
          type="number"
          value={configuration.delayMs}
        />
        <Select
          label={`${label} easing`}
          onChange={(event) =>
            onChange({ ...configuration, easing: event.currentTarget.value })
          }
          options={EASING_OPTIONS}
          value={configuration.easing}
        />
      </>
    )}
  </section>
);

export const PlacementInspector = ({
  component,
  placement,
  resourceContext,
  resources,
  onSave,
  onRemove,
}: {
  readonly component: ComponentDto;
  readonly placement: ComponentPlacementDto;
  readonly resourceContext: ResourceContext;
  readonly resources: readonly ResourceDto[];
  readonly onSave: (
    bindings: Readonly<Record<string, BindingDto>>,
    visibleByDefault: boolean,
    enterAnimationOverride: AnimationConfig | null,
    exitAnimationOverride: AnimationConfig | null,
  ) => Promise<void>;
  readonly onRemove: () => Promise<void>;
}) => {
  const [bindings, setBindings] = useState(placement.bindings);
  const [visible, setVisible] = useState(placement.visibleByDefault);
  const [enterAnimation, setEnterAnimation] = useState<AnimationConfig | null>(
    placement.enterAnimationOverride,
  );
  const [exitAnimation, setExitAnimation] = useState<AnimationConfig | null>(
    placement.exitAnimationOverride,
  );
  const update = (key: string, binding: BindingDto): void => {
    const next = { ...bindings, [key]: binding };
    setBindings(next);
    void onSave(next, visible, enterAnimation, exitAnimation);
  };
  return (
    <div className={styles["inspector"]}>
      <p className={styles["scope"]}>Component Placement · Layout default</p>
      <h3>{component.name}</h3>
      {component.propertySchema.map((property) => {
        const binding = bindings[property.key] ?? initialBinding(property);
        const category = compatibleCategory(property.type);
        const resourceOptions = resources
          .filter((resource) => resource.category === category)
          .map((resource) => ({
            label:
              resource.deviceState === null
                ? resource.displayName
                : `${resource.displayName} — ${resource.deviceState.replace(/([A-Z])/gu, " $1").toLowerCase()}`,
            value: resource.id,
          }));
        return (
          <section className={styles["property"]} key={property.key}>
            <strong>{property.label}</strong>
            <Select
              label="Value source"
              onChange={(event) => {
                const kind = event.currentTarget.value as BindingDto["kind"];
                const next: BindingDto =
                  kind === "resource"
                    ? resourceOptions[0] === undefined
                      ? binding
                      : { kind, resourceId: resourceOptions[0].value }
                    : kind === "segmentField"
                      ? { kind, fieldKey: "" }
                      : kind === "episodeMetadata" || kind === "showMetadata"
                        ? {
                            kind,
                            field:
                              kind === "episodeMetadata" ? "title" : "name",
                          }
                        : initialBinding(property);
                update(property.key, next);
              }}
              options={[
                { label: "Fixed value", value: "literal" },
                ...(category === undefined
                  ? []
                  : [{ label: "Fixed Resource", value: "resource" }]),
                { label: "Segment field", value: "segmentField" },
                { label: "Episode details", value: "episodeMetadata" },
                { label: "Show details", value: "showMetadata" },
              ]}
              value={binding.kind}
            />
            {binding.kind === "literal" &&
            component.type === "lowerThird" &&
            property.key === "stylePreset" ? (
              <Select
                label="Style preset"
                onChange={(event) =>
                  update(property.key, {
                    kind: "literal",
                    value: event.currentTarget.value,
                  })
                }
                options={[...LOWER_THIRD_STYLE_PRESETS]}
                value={String(binding.value ?? "quietGold")}
              />
            ) : binding.kind === "literal" ? (
              <TextInput
                defaultValue={String(binding.value ?? "")}
                key={`${placement.updatedAt}-${property.key}-literal`}
                label={property.label}
                onBlur={(event) =>
                  update(property.key, {
                    kind: "literal",
                    value: event.currentTarget.value,
                  })
                }
              />
            ) : binding.kind === "resource" ? null : binding.kind ===
              "segmentField" ? (
              <TextInput
                defaultValue={binding.fieldKey}
                key={`${placement.updatedAt}-${property.key}-field`}
                label="Use Segment field"
                onBlur={(event) =>
                  update(property.key, {
                    kind: "segmentField",
                    fieldKey: event.currentTarget.value.trim(),
                  })
                }
                placeholder="Lower Third Title"
              />
            ) : (
              <TextInput
                defaultValue={binding.field}
                key={`${placement.updatedAt}-${property.key}-metadata`}
                label={
                  binding.kind === "episodeMetadata"
                    ? "Episode detail"
                    : "Show detail"
                }
                onBlur={(event) =>
                  update(property.key, {
                    ...binding,
                    field: event.currentTarget.value.trim(),
                  })
                }
              />
            )}
            {category === "cameraInput" ? (
              <>
                <Select
                  disabled={resourceOptions.length === 0}
                  label="Camera device"
                  onChange={(event) =>
                    update(property.key, {
                      kind: "resource",
                      resourceId: event.currentTarget.value,
                    })
                  }
                  options={
                    resourceOptions.length === 0
                      ? [{ label: "No camera devices available", value: "" }]
                      : resourceOptions
                  }
                  value={binding.kind === "resource" ? binding.resourceId : ""}
                />
                {resourceOptions.length === 0 ? (
                  <p role="status">
                    Connect a camera or allow camera access, then reopen this
                    Layout.
                  </p>
                ) : null}
              </>
            ) : category === undefined ? null : (
              <ResourcePicker
                category={category}
                context={resourceContext}
                inputId={`placement-resource-${placement.id}-${property.key}`}
                label={`Fixed ${property.label}`}
                onSelect={(resourceId) =>
                  update(
                    property.key,
                    resourceId === undefined
                      ? initialBinding(property)
                      : { kind: "resource", resourceId },
                  )
                }
                required={property.required}
                {...(binding.kind === "resource"
                  ? { selectedResourceId: binding.resourceId }
                  : {})}
              />
            )}
          </section>
        );
      })}
      <Checkbox
        checked={visible}
        label="Visible by default"
        onChange={(event) => {
          setVisible(event.currentTarget.checked);
          void onSave(
            bindings,
            event.currentTarget.checked,
            enterAnimation,
            exitAnimation,
          );
        }}
      />
      <AnimationControls
        configuration={enterAnimation}
        defaultConfiguration={component.defaultEnterAnimation}
        label="Enter"
        onChange={(configuration) => {
          setEnterAnimation(configuration);
          void onSave(bindings, visible, configuration, exitAnimation);
        }}
      />
      <AnimationControls
        configuration={exitAnimation}
        defaultConfiguration={component.defaultExitAnimation}
        label="Exit"
        onChange={(configuration) => {
          setExitAnimation(configuration);
          void onSave(bindings, visible, enterAnimation, configuration);
        }}
      />
      <Button onClick={() => void onRemove()} variant="destructive">
        Remove Component
      </Button>
    </div>
  );
};
