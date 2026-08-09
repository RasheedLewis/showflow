export interface ExecutionClock {
  now(): number;
  wait(durationMs: number, signal: AbortSignal): Promise<void>;
}

const abortError = (): Error => {
  const error = new Error("The production action was cancelled.");
  error.name = "AbortError";
  return error;
};

export const isExecutionAbort = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

export const createSystemExecutionClock = (): ExecutionClock => ({
  now: () => Date.now(),
  wait: (durationMs, signal) =>
    new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(abortError());
        return;
      }
      const finish = (): void => {
        signal.removeEventListener("abort", cancel);
        resolve();
      };
      const timeout = setTimeout(finish, Math.max(0, durationMs));
      const cancel = (): void => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", cancel);
        reject(abortError());
      };
      signal.addEventListener("abort", cancel, { once: true });
    }),
});

interface PendingWait {
  readonly at: number;
  readonly reject: (reason: Error) => void;
  readonly resolve: () => void;
  settled: boolean;
}

export interface FakeExecutionClock extends ExecutionClock {
  advanceBy(durationMs: number): void;
  pendingWaitCount(): number;
}

export const createFakeExecutionClock = (
  initialTime = 0,
): FakeExecutionClock => {
  let currentTime = initialTime;
  const waits: PendingWait[] = [];
  const settleReady = (): void => {
    for (const wait of waits) {
      if (!wait.settled && wait.at <= currentTime) {
        wait.settled = true;
        wait.resolve();
      }
    }
  };
  return {
    now: () => currentTime,
    wait: (durationMs, signal) =>
      new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          reject(abortError());
          return;
        }
        const wait: PendingWait = {
          at: currentTime + Math.max(0, durationMs),
          reject,
          resolve,
          settled: false,
        };
        waits.push(wait);
        signal.addEventListener(
          "abort",
          () => {
            if (wait.settled) return;
            wait.settled = true;
            reject(abortError());
          },
          { once: true },
        );
        settleReady();
      }),
    advanceBy: (durationMs) => {
      if (!Number.isFinite(durationMs) || durationMs < 0) {
        throw new TypeError("Fake clock advancement must be zero or positive.");
      }
      currentTime += durationMs;
      settleReady();
    },
    pendingWaitCount: () => waits.filter(({ settled }) => !settled).length,
  };
};
