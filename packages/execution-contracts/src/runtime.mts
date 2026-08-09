import type { ExecutionClock } from "./clock.mjs";
import { isExecutionAbort } from "./clock.mjs";
import type {
  ExecutionInstruction,
  LayoutExecutionTarget,
  ResourceExecutionTarget,
  SegmentExecutionPlan,
  SegmentExecutionTarget,
} from "./instructions.mjs";

export const RUNTIME_STATES = Object.freeze([
  "idle",
  "preparing",
  "entering",
  "active",
  "exiting",
  "cleaningUp",
  "stopped",
  "failed",
] as const);
export type RuntimeState = (typeof RUNTIME_STATES)[number];

const TRANSITIONS: Readonly<Record<RuntimeState, readonly RuntimeState[]>> = {
  idle: ["preparing", "stopped"],
  preparing: ["entering", "stopped", "failed"],
  entering: ["active", "stopped", "failed"],
  active: ["exiting", "stopped", "failed"],
  exiting: ["cleaningUp", "stopped", "failed"],
  cleaningUp: ["stopped", "failed"],
  stopped: ["idle", "preparing"],
  failed: ["stopped", "idle"],
};

export const canTransitionRuntime = (
  from: RuntimeState,
  to: RuntimeState,
): boolean => TRANSITIONS[from].includes(to);

export const assertRuntimeTransition = (
  from: RuntimeState,
  to: RuntimeState,
): void => {
  if (!canTransitionRuntime(from, to)) {
    throw new TypeError(`Segment runtime cannot move from ${from} to ${to}.`);
  }
};

export interface RuntimeFailure {
  readonly affectedObject:
    LayoutExecutionTarget | ResourceExecutionTarget | SegmentExecutionTarget;
  readonly canRetry: boolean;
  readonly message: string;
}

export interface RuntimeSnapshot {
  readonly activeLayout?: LayoutExecutionTarget | undefined;
  readonly failure?: RuntimeFailure | undefined;
  readonly segment?: SegmentExecutionTarget | undefined;
  readonly state: RuntimeState;
}

export interface ExecutionContext {
  readonly clock: ExecutionClock;
  readonly signal: AbortSignal;
}

export interface ProductionExecutionAdapter {
  activateLayout(
    layout: LayoutExecutionTarget,
    context: ExecutionContext,
  ): Promise<void>;
  clearTemporaryState(context: ExecutionContext): Promise<void>;
  deactivateLayout(
    layout: LayoutExecutionTarget,
    context: ExecutionContext,
  ): Promise<void>;
  playResource(
    resource: ResourceExecutionTarget,
    context: ExecutionContext,
  ): Promise<void>;
  preloadResource(
    resource: ResourceExecutionTarget,
    context: ExecutionContext,
  ): Promise<void>;
  setActiveDefaults(
    instruction: Extract<ExecutionInstruction, { kind: "setActiveDefaults" }>,
    context: ExecutionContext,
  ): Promise<void>;
  stopResource(
    resource: ResourceExecutionTarget,
    context: ExecutionContext,
  ): Promise<void>;
  waitForAnimation(
    instruction: Extract<
      ExecutionInstruction,
      { kind: "waitForAnimationCompletion" }
    >,
    context: ExecutionContext,
  ): Promise<void>;
  waitForMedia(
    resource: ResourceExecutionTarget | undefined,
    context: ExecutionContext,
  ): Promise<void>;
}

export class ProductionExecutionError extends Error {
  constructor(
    message: string,
    readonly affectedObject: LayoutExecutionTarget | ResourceExecutionTarget,
    readonly canRetry = true,
  ) {
    super(message);
    this.name = "ProductionExecutionError";
  }
}

type SnapshotListener = (snapshot: RuntimeSnapshot) => void;

const instructionObject = (
  instruction: ExecutionInstruction | undefined,
): LayoutExecutionTarget | ResourceExecutionTarget | undefined => {
  if (instruction === undefined) return undefined;
  switch (instruction.kind) {
    case "activateLayout":
      return instruction.layout;
    case "preloadResource":
    case "playResource":
    case "stopResource":
      return instruction.resource;
    case "waitForAnimationCompletion":
      return instruction.layout;
    case "waitForMediaCompletion":
      return instruction.resource;
    case "setActiveDefaults":
      return instruction.defaultLayout;
    case "clearTemporaryState":
      return undefined;
  }
};

export class SegmentRuntime {
  private snapshotValue: RuntimeSnapshot = { state: "idle" };
  private readonly listeners = new Set<SnapshotListener>();
  private controller: AbortController | undefined;
  private currentInstruction: ExecutionInstruction | undefined;
  private currentPlan: SegmentExecutionPlan | undefined;

  constructor(
    private readonly adapter: ProductionExecutionAdapter,
    private readonly clock: ExecutionClock,
  ) {}

  get snapshot(): RuntimeSnapshot {
    return this.snapshotValue;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshotValue);
    return () => this.listeners.delete(listener);
  }

  private publish(
    patch: Omit<RuntimeSnapshot, "state"> & { state?: RuntimeState },
  ): void {
    this.snapshotValue = {
      ...this.snapshotValue,
      ...patch,
      state: patch.state ?? this.snapshotValue.state,
    };
    for (const listener of this.listeners) listener(this.snapshotValue);
  }

  private transition(state: RuntimeState): void {
    assertRuntimeTransition(this.snapshotValue.state, state);
    this.publish({ state });
  }

  private context(controller: AbortController): ExecutionContext {
    return { clock: this.clock, signal: controller.signal };
  }

  private async execute(
    instructions: readonly ExecutionInstruction[],
    controller: AbortController,
  ): Promise<void> {
    for (const instruction of instructions) {
      if (controller.signal.aborted) return;
      this.currentInstruction = instruction;
      const context = this.context(controller);
      switch (instruction.kind) {
        case "preloadResource":
          await this.adapter.preloadResource(instruction.resource, context);
          break;
        case "activateLayout": {
          const active = this.snapshotValue.activeLayout;
          if (active !== undefined && active.id !== instruction.layout.id) {
            await this.adapter.deactivateLayout(active, context);
          }
          await this.adapter.activateLayout(instruction.layout, context);
          this.publish({ activeLayout: instruction.layout });
          break;
        }
        case "playResource":
          await this.adapter.playResource(instruction.resource, context);
          break;
        case "stopResource":
          await this.adapter.stopResource(instruction.resource, context);
          break;
        case "waitForAnimationCompletion":
          await this.adapter.waitForAnimation(instruction, context);
          break;
        case "waitForMediaCompletion":
          await this.adapter.waitForMedia(instruction.resource, context);
          break;
        case "setActiveDefaults":
          await this.adapter.setActiveDefaults(instruction, context);
          break;
        case "clearTemporaryState":
          await this.adapter.clearTemporaryState(context);
          this.publish({ activeLayout: undefined });
          break;
      }
    }
    this.currentInstruction = undefined;
  }

  private fail(error: unknown, plan: SegmentExecutionPlan): void {
    const affectedObject =
      error instanceof ProductionExecutionError
        ? error.affectedObject
        : (instructionObject(this.currentInstruction) ?? plan.segment);
    const detail =
      error instanceof Error
        ? error.message
        : "The audience output could not continue.";
    const message =
      affectedObject.id === plan.segment.id
        ? `The ${plan.segment.name} Segment could not continue. ${detail}`
        : `The ${plan.segment.name} Segment could not use ${affectedObject.name}. ${detail}`;
    this.transition("failed");
    this.publish({
      failure: {
        affectedObject,
        canRetry:
          error instanceof ProductionExecutionError ? error.canRetry : true,
        message,
      },
    });
  }

  async enter(plan: SegmentExecutionPlan): Promise<void> {
    if (this.snapshotValue.state === "stopped") this.transition("idle");
    if (this.snapshotValue.state !== "idle") {
      throw new TypeError(
        "Enter is available only from a clean Segment runtime.",
      );
    }
    this.currentPlan = plan;
    const controller = new AbortController();
    this.controller = controller;
    this.publish({ failure: undefined, segment: plan.segment });
    try {
      this.transition("preparing");
      await this.execute(plan.prepare, controller);
      if (controller.signal.aborted) return;
      this.transition("entering");
      await this.execute(plan.enter, controller);
      if (controller.signal.aborted) return;
      await this.execute(plan.active, controller);
      if (controller.signal.aborted) return;
      this.transition("active");
    } catch (error) {
      if (!isExecutionAbort(error) && !controller.signal.aborted)
        this.fail(error, plan);
    } finally {
      if (this.controller === controller) this.controller = undefined;
    }
  }

  async exit(): Promise<void> {
    const plan = this.currentPlan;
    if (plan === undefined || this.snapshotValue.state !== "active") {
      throw new TypeError("Exit is available only while a Segment is Active.");
    }
    const controller = new AbortController();
    this.controller = controller;
    try {
      this.transition("exiting");
      await this.execute(plan.exit, controller);
      if (controller.signal.aborted) return;
      const activeLayout = this.snapshotValue.activeLayout;
      if (activeLayout !== undefined) {
        await this.adapter.deactivateLayout(
          activeLayout,
          this.context(controller),
        );
        this.publish({ activeLayout: undefined });
      }
      if (controller.signal.aborted) return;
      this.transition("cleaningUp");
      await this.execute(plan.cleanup, controller);
      if (controller.signal.aborted) return;
      this.transition("stopped");
    } catch (error) {
      if (!isExecutionAbort(error) && !controller.signal.aborted)
        this.fail(error, plan);
    } finally {
      if (this.controller === controller) this.controller = undefined;
    }
  }

  async switchLayout(
    layout: LayoutExecutionTarget,
    durationMs = 0,
  ): Promise<void> {
    const plan = this.currentPlan;
    if (plan === undefined || this.snapshotValue.state !== "active") {
      throw new TypeError(
        "Layout changes are available only while a Segment is Active.",
      );
    }
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    try {
      await this.execute(
        [
          { kind: "activateLayout", layout },
          { kind: "waitForAnimationCompletion", layout, durationMs },
        ],
        controller,
      );
    } catch (error) {
      if (!isExecutionAbort(error) && !controller.signal.aborted)
        this.fail(error, plan);
    } finally {
      if (this.controller === controller) this.controller = undefined;
    }
  }

  async stop(): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    try {
      await this.adapter.clearTemporaryState(this.context(controller));
    } finally {
      const state = this.snapshotValue.state;
      if (state !== "stopped") {
        if (state === "idle") this.transition("stopped");
        else if (canTransitionRuntime(state, "stopped"))
          this.transition("stopped");
      }
      this.publish({ activeLayout: undefined });
    }
  }

  async restart(): Promise<void> {
    const plan = this.currentPlan;
    if (plan === undefined) {
      throw new TypeError("Restart requires a Segment execution plan.");
    }
    await this.jump(plan);
  }

  async jump(plan: SegmentExecutionPlan): Promise<void> {
    await this.stop();
    await this.enter(plan);
  }

  async retry(): Promise<void> {
    if (this.snapshotValue.state !== "failed") {
      throw new TypeError("Retry is available only after a runtime failure.");
    }
    await this.restart();
  }
}
