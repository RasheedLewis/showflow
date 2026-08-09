export const ANIMATION_PRESETS = Object.freeze([
  "none",
  "fade",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "scaleIn",
  "scaleOut",
  "pop",
  "wipe",
] as const);
export type AnimationPreset = (typeof ANIMATION_PRESETS)[number];

export interface AnimationConfig {
  readonly delayMs: number;
  readonly durationMs: number;
  readonly easing: string;
  readonly preset: AnimationPreset;
}

export interface AnimationComponentSource {
  readonly defaultEnterAnimation: AnimationConfig;
  readonly defaultExitAnimation: AnimationConfig;
}

export interface AnimationPlacementSource {
  readonly enterAnimationOverride?: AnimationConfig | null | undefined;
  readonly exitAnimationOverride?: AnimationConfig | null | undefined;
}

export interface AnimationVisualState {
  readonly clipPath?: string;
  readonly opacity?: number;
  readonly transform?: string;
}

export interface AnimationPresetDefinition {
  readonly enter: {
    readonly from: AnimationVisualState;
    readonly to: AnimationVisualState;
  };
  readonly exit: {
    readonly from: AnimationVisualState;
    readonly to: AnimationVisualState;
  };
  readonly label: string;
}

const visible = Object.freeze({ opacity: 1 });
const hidden = Object.freeze({ opacity: 0 });
const pair = (
  label: string,
  from: AnimationVisualState,
  to: AnimationVisualState = visible,
): AnimationPresetDefinition =>
  Object.freeze({
    label,
    enter: Object.freeze({ from: Object.freeze(from), to: Object.freeze(to) }),
    exit: Object.freeze({ from: Object.freeze(to), to: Object.freeze(from) }),
  });

export const ANIMATION_REGISTRY: Readonly<
  Record<AnimationPreset, AnimationPresetDefinition>
> = Object.freeze({
  none: pair("None", visible),
  fade: pair("Fade", hidden),
  slideUp: pair("Slide Up", { opacity: 0, transform: "translateY(12%)" }),
  slideDown: pair("Slide Down", {
    opacity: 0,
    transform: "translateY(-12%)",
  }),
  slideLeft: pair("Slide Left", {
    opacity: 0,
    transform: "translateX(12%)",
  }),
  slideRight: pair("Slide Right", {
    opacity: 0,
    transform: "translateX(-12%)",
  }),
  scaleIn: pair("Scale In", { opacity: 0, transform: "scale(0.94)" }),
  scaleOut: pair("Scale Out", { opacity: 0, transform: "scale(1.06)" }),
  pop: pair("Pop", { opacity: 0, transform: "scale(0.88)" }),
  wipe: pair(
    "Wipe",
    { clipPath: "inset(0 100% 0 0)", opacity: 1 },
    {
      clipPath: "inset(0 0 0 0)",
      opacity: 1,
    },
  ),
});

export const ANIMATION_PRESET_OPTIONS = Object.freeze(
  Object.entries(ANIMATION_REGISTRY).map(([value, definition]) => ({
    label: definition.label,
    value: value as AnimationPreset,
  })),
);

export const getAnimationDefinition = (
  preset: AnimationPreset,
): AnimationPresetDefinition => ANIMATION_REGISTRY[preset];

export const resolvePlacementAnimation = (
  component: Pick<
    AnimationComponentSource,
    "defaultEnterAnimation" | "defaultExitAnimation"
  >,
  placement: Pick<
    AnimationPlacementSource,
    "enterAnimationOverride" | "exitAnimationOverride"
  >,
  phase: "enter" | "exit",
): AnimationConfig =>
  phase === "enter"
    ? (placement.enterAnimationOverride ?? component.defaultEnterAnimation)
    : (placement.exitAnimationOverride ?? component.defaultExitAnimation);

export const getAnimationCompletionMs = (
  configuration: AnimationConfig,
  reducedMotion: boolean,
): number =>
  reducedMotion || configuration.preset === "none"
    ? 0
    : configuration.delayMs + configuration.durationMs;
