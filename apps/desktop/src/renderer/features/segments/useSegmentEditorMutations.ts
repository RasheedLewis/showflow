import type {
  SegmentDataFieldDto,
  SegmentDataFieldTypeDto,
  ShowDesignDto,
  ShowSegmentEditorDto,
  ShowSegmentEditorResult,
} from "@showflow/contracts";
import type { SaveState } from "@showflow/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { showDesignQueryKey } from "../shows/show-queries";
import { segmentEditorQueryKey } from "./segment-editor-queries";

export interface SegmentDetailsDraft {
  readonly expectedDurationMs: number | null;
  readonly name: string;
  readonly notesTemplate: string;
}

export interface SegmentFieldDraft {
  readonly defaultValue: SegmentDataFieldDto["defaultValue"];
  readonly helpText: string | null;
  readonly label: string;
  readonly required: boolean;
  readonly type: SegmentDataFieldTypeDto;
}

type HistoryInstruction =
  | { readonly kind: "details"; readonly value: SegmentDetailsDraft }
  | { readonly kind: "delete-field"; readonly fieldId: string }
  | {
      readonly kind: "restore-field";
      readonly field: SegmentDataFieldDto;
    }
  | { readonly kind: "update-field"; readonly field: SegmentDataFieldDto }
  | { readonly kind: "reorder-fields"; readonly fieldIds: readonly string[] };
type HistoryCommand = () => Promise<HistoryCommand>;
type ApplyHistoryInstruction = (
  instruction: HistoryInstruction,
) => Promise<HistoryInstruction>;

const createHistoryCommand =
  (
    applyInstruction: ApplyHistoryInstruction,
    instruction: HistoryInstruction,
  ): HistoryCommand =>
  async () =>
    createHistoryCommand(applyInstruction, await applyInstruction(instruction));

export interface SegmentEditorMutations {
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly createField: (
    label: string,
    type: SegmentDataFieldTypeDto,
  ) => Promise<void>;
  readonly deleteField: (fieldId: string) => Promise<void>;
  readonly error: string | undefined;
  readonly isSaving: boolean;
  readonly redo: () => Promise<void>;
  readonly reorderFields: (fieldIds: readonly string[]) => Promise<void>;
  readonly saveState: SaveState;
  readonly undo: () => Promise<void>;
  readonly updateDetails: (value: SegmentDetailsDraft) => Promise<void>;
  readonly updateField: (
    fieldId: string,
    value: SegmentFieldDraft,
  ) => Promise<void>;
}

const detailsOf = (editor: ShowSegmentEditorDto): SegmentDetailsDraft => ({
  expectedDurationMs: editor.expectedDurationMs,
  name: editor.name,
  notesTemplate: editor.notesTemplate,
});

const sameDetails = (
  left: SegmentDetailsDraft,
  right: SegmentDetailsDraft,
): boolean =>
  left.expectedDurationMs === right.expectedDurationMs &&
  left.name === right.name &&
  left.notesTemplate === right.notesTemplate;

const sameField = (
  field: SegmentDataFieldDto,
  value: SegmentFieldDraft,
): boolean =>
  field.defaultValue === value.defaultValue &&
  field.helpText === value.helpText &&
  field.label === value.label &&
  field.required === value.required &&
  field.type === value.type;

export const useSegmentEditorMutations = (
  editor: ShowSegmentEditorDto | undefined,
): SegmentEditorMutations => {
  const queryClient = useQueryClient();
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState<string>();
  const [pendingCount, setPendingCount] = useState(0);
  const [historyState, setHistoryState] = useState({
    canRedo: false,
    canUndo: false,
  });
  const queue = useRef<Promise<void>>(Promise.resolve());
  const undoStack = useRef<HistoryCommand[]>([]);
  const redoStack = useRef<HistoryCommand[]>([]);
  const ids = useMemo(
    () =>
      editor === undefined
        ? undefined
        : {
            showId: editor.showId,
            showSegmentId: editor.id,
          },
    [editor],
  );

  const findCurrentEntry = useCallback((): {
    readonly editor: ShowSegmentEditorDto;
    readonly key: ReturnType<typeof segmentEditorQueryKey>;
  } => {
    if (ids === undefined) throw new Error("Segment editor is not loaded.");
    const entries = queryClient.getQueriesData<ShowSegmentEditorDto>({
      queryKey: ["segment-editor"],
    });
    const match = entries.find(
      ([, candidate]) =>
        candidate?.id === ids.showSegmentId && candidate.showId === ids.showId,
    );
    if (match?.[1] !== undefined) {
      return {
        editor: match[1],
        key: match[0] as ReturnType<typeof segmentEditorQueryKey>,
      };
    }
    if (editor === undefined) throw new Error("Segment editor is not loaded.");
    return {
      editor,
      key: segmentEditorQueryKey("current", ids.showId, ids.showSegmentId),
    };
  }, [editor, ids, queryClient]);

  const applyResult = useCallback(
    async (
      request: (
        current: ShowSegmentEditorDto,
        studioId: string,
      ) => Promise<ShowSegmentEditorResult>,
    ): Promise<ShowSegmentEditorDto> => {
      setPendingCount((count) => count + 1);
      setSaveState("saving");
      setError(undefined);
      let resolveOperation: (value: ShowSegmentEditorDto) => void;
      let rejectOperation: (reason: unknown) => void;
      const operation = new Promise<ShowSegmentEditorDto>((resolve, reject) => {
        resolveOperation = resolve;
        rejectOperation = reject;
      });
      queue.current = queue.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const { editor: current, key } = findCurrentEntry();
            const studioId = key[1];
            const result = await request(current, studioId);
            if (!result.ok) throw new Error(result.error.message);
            queryClient.setQueryData(key, result.data);
            queryClient.setQueryData<ShowDesignDto>(
              showDesignQueryKey(studioId, result.data.showId),
              (design) =>
                design === undefined
                  ? design
                  : {
                      ...design,
                      segments: design.segments.map((item) =>
                        item.segment.id === result.data.id
                          ? {
                              ...item,
                              segment: {
                                ...item.segment,
                                expectedDurationMs:
                                  result.data.expectedDurationMs,
                                name: result.data.name,
                                updatedAt: result.data.updatedAt,
                              },
                            }
                          : item,
                      ),
                    },
            );
            setSaveState("saved");
            resolveOperation(result.data);
          } catch (requestError) {
            const message =
              requestError instanceof Error
                ? requestError.message
                : "Showflow could not save this Segment change. Your last saved version is still available. Try again.";
            setSaveState("error");
            setError(message);
            rejectOperation(requestError);
          } finally {
            setPendingCount((count) => Math.max(0, count - 1));
          }
        });
      return operation;
    },
    [findCurrentEntry, queryClient],
  );

  const scope = useCallback(
    (current: ShowSegmentEditorDto, studioId: string) => ({
      expectedUpdatedAt: current.updatedAt,
      showId: current.showId,
      showSegmentId: current.id,
      studioId,
    }),
    [],
  );

  const applyInstruction = useCallback(
    async (instruction: HistoryInstruction): Promise<HistoryInstruction> => {
      const current = findCurrentEntry().editor;
      switch (instruction.kind) {
        case "details": {
          const inverse = {
            kind: "details",
            value: detailsOf(current),
          } as const;
          await applyResult((latest, studioId) =>
            window.showflow.segments.updateDetails({
              ...scope(latest, studioId),
              ...instruction.value,
            }),
          );
          return inverse;
        }
        case "delete-field": {
          const field = current.dataFields.find(
            ({ id }) => id === instruction.fieldId,
          );
          if (field === undefined)
            throw new Error("Segment field was not found.");
          await applyResult((latest, studioId) =>
            window.showflow.segments.deleteField({
              ...scope(latest, studioId),
              fieldId: instruction.fieldId,
            }),
          );
          return { kind: "restore-field", field };
        }
        case "restore-field": {
          const { episodeValueUsageCount, ...field } = instruction.field;
          void episodeValueUsageCount;
          await applyResult((latest, studioId) =>
            window.showflow.segments.restoreField({
              ...scope(latest, studioId),
              field,
            }),
          );
          return { kind: "delete-field", fieldId: field.id };
        }
        case "update-field": {
          const before = current.dataFields.find(
            ({ id }) => id === instruction.field.id,
          );
          if (before === undefined)
            throw new Error("Segment field was not found.");
          await applyResult((latest, studioId) =>
            window.showflow.segments.updateField({
              ...scope(latest, studioId),
              defaultValue: instruction.field.defaultValue,
              fieldId: instruction.field.id,
              helpText: instruction.field.helpText,
              label: instruction.field.label,
              required: instruction.field.required,
              type: instruction.field.type,
            }),
          );
          return { kind: "update-field", field: before };
        }
        case "reorder-fields": {
          const inverse = current.dataFields.map(({ id }) => id);
          await applyResult((latest, studioId) =>
            window.showflow.segments.reorderFields({
              ...scope(latest, studioId),
              orderedFieldIds: [...instruction.fieldIds],
            }),
          );
          return { kind: "reorder-fields", fieldIds: inverse };
        }
      }
    },
    [applyResult, findCurrentEntry, scope],
  );

  const makeHistoryCommand = useCallback(
    (instruction: HistoryInstruction): HistoryCommand =>
      createHistoryCommand(applyInstruction, instruction),
    [applyInstruction],
  );

  const refreshHistoryState = useCallback((): void => {
    setHistoryState({
      canRedo: redoStack.current.length > 0,
      canUndo: undoStack.current.length > 0,
    });
  }, []);

  const record = useCallback(
    (instruction: HistoryInstruction): void => {
      undoStack.current.push(makeHistoryCommand(instruction));
      redoStack.current = [];
      refreshHistoryState();
    },
    [makeHistoryCommand, refreshHistoryState],
  );

  const updateDetails = useCallback(
    async (value: SegmentDetailsDraft): Promise<void> => {
      const current = findCurrentEntry().editor;
      const before = detailsOf(current);
      if (sameDetails(before, value)) return;
      await applyInstruction({ kind: "details", value });
      record({ kind: "details", value: before });
    },
    [applyInstruction, findCurrentEntry, record],
  );

  const createField = useCallback(
    async (label: string, type: SegmentDataFieldTypeDto): Promise<void> => {
      const beforeIds = new Set(
        findCurrentEntry().editor.dataFields.map(({ id }) => id),
      );
      const updated = await applyResult((current, studioId) =>
        window.showflow.segments.createField({
          ...scope(current, studioId),
          label,
          type,
        }),
      );
      const created = updated.dataFields.find(({ id }) => !beforeIds.has(id));
      if (created !== undefined)
        record({ kind: "delete-field", fieldId: created.id });
    },
    [applyResult, findCurrentEntry, record, scope],
  );

  const updateField = useCallback(
    async (fieldId: string, value: SegmentFieldDraft): Promise<void> => {
      const before = findCurrentEntry().editor.dataFields.find(
        ({ id }) => id === fieldId,
      );
      if (before === undefined) throw new Error("Segment field was not found.");
      if (sameField(before, value)) return;
      await applyResult((current, studioId) =>
        window.showflow.segments.updateField({
          ...scope(current, studioId),
          ...value,
          fieldId,
        }),
      );
      record({ kind: "update-field", field: before });
    },
    [applyResult, findCurrentEntry, record, scope],
  );

  const deleteField = useCallback(
    async (fieldId: string): Promise<void> => {
      const before = findCurrentEntry().editor.dataFields.find(
        ({ id }) => id === fieldId,
      );
      if (before === undefined) throw new Error("Segment field was not found.");
      await applyResult((current, studioId) =>
        window.showflow.segments.deleteField({
          ...scope(current, studioId),
          fieldId,
        }),
      );
      record({ kind: "restore-field", field: before });
    },
    [applyResult, findCurrentEntry, record, scope],
  );

  const reorderFields = useCallback(
    async (fieldIds: readonly string[]): Promise<void> => {
      const before = findCurrentEntry().editor.dataFields.map(({ id }) => id);
      if (before.every((id, index) => id === fieldIds[index])) return;
      await applyInstruction({ kind: "reorder-fields", fieldIds });
      record({ kind: "reorder-fields", fieldIds: before });
    },
    [applyInstruction, findCurrentEntry, record],
  );

  const runHistory = useCallback(
    async (
      from: MutableRefObject<HistoryCommand[]>,
      to: MutableRefObject<HistoryCommand[]>,
    ): Promise<void> => {
      const command = from.current.pop();
      if (command === undefined) return;
      refreshHistoryState();
      try {
        to.current.push(await command());
      } catch {
        from.current.push(command);
      } finally {
        refreshHistoryState();
      }
    },
    [refreshHistoryState],
  );

  return {
    canRedo: historyState.canRedo,
    canUndo: historyState.canUndo,
    createField,
    deleteField,
    error,
    isSaving: pendingCount > 0,
    redo: () => runHistory(redoStack, undoStack),
    reorderFields,
    saveState: pendingCount > 0 ? "saving" : saveState,
    undo: () => runHistory(undoStack, redoStack),
    updateDetails,
    updateField,
  };
};
