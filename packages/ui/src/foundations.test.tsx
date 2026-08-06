import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Divider,
  Drawer,
  EmptyState,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  Panel,
  SaveStateIndicator,
  Select,
  Skeleton,
  Tabs,
  TextArea,
  TextInput,
  Toggle,
  Tooltip,
} from "./index.js";

describe("foundational controls", () => {
  it("renders button variants, sizes, icons, focus, and disabled state", async () => {
    render(
      <>
        <Button leadingIcon="plus" variant="primary">
          Add Segment
        </Button>
        <Button disabled size="small" variant="destructive">
          Remove
        </Button>
        <IconButton icon="more" label="More actions" tooltip="More actions" />
      </>,
    );

    const primary = screen.getByRole("button", { name: "Add Segment" });
    primary.focus();
    expect(primary).toHaveFocus();
    expect(primary.className).toContain("button-primary");
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
    const iconButton = screen.getByRole("button", { name: "More actions" });
    iconButton.focus();
    fireEvent.focus(iconButton);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "More actions",
    );
  });

  it("connects field labels, help, errors, and disabled state", () => {
    render(
      <>
        <TextInput error="Enter a Segment name." label="Segment name" />
        <TextArea disabled helpText="Visible to the host." label="Notes" />
        <Select
          label="Layout"
          options={[{ label: "Full Frame", value: "full-frame" }]}
          placeholder="Choose a Layout"
        />
      </>,
    );

    expect(
      screen.getByRole("textbox", { name: "Segment name" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a Segment name.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Layout" })).toHaveDisplayValue(
      "Choose a Layout",
    );
  });

  it("supports checkbox and switch interaction", () => {
    const onCheckedChange = vi.fn();
    render(
      <>
        <Checkbox label="Include in Blueprint" />
        <Toggle
          checked={false}
          label="Safe areas"
          onCheckedChange={onCheckedChange}
        />
      </>,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Include in Blueprint" }),
    );
    expect(
      screen.getByRole("checkbox", { name: "Include in Blueprint" }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole("switch", { name: "Safe areas" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe("foundational navigation and overlays", () => {
  it("moves between tabs with arrow keys", async () => {
    render(
      <Tabs
        defaultValue="storyboard"
        items={[
          {
            content: "Storyboard content",
            label: "Storyboard",
            value: "storyboard",
          },
          { content: "Segments content", label: "Segments", value: "segments" },
          {
            content: "Disabled content",
            disabled: true,
            label: "Resources",
            value: "resources",
          },
        ]}
        label="Show workspace"
      />,
    );

    const storyboard = screen.getByRole("tab", { name: "Storyboard" });
    storyboard.focus();
    fireEvent.keyDown(storyboard, {
      code: "ArrowRight",
      key: "ArrowRight",
      keyCode: 39,
      which: 39,
    });
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Segments" })).toHaveFocus(),
    );
    expect(screen.getByText("Segments content")).toBeVisible();
    expect(screen.getByRole("tab", { name: "Resources" })).toBeDisabled();
  });

  it("opens a menu from the keyboard and selects an item", async () => {
    const onSelect = vi.fn();
    render(
      <Menu trigger={<Button>Show actions</Button>}>
        <MenuItem onSelect={onSelect} shortcut="⌘D">
          Duplicate Segment
        </MenuItem>
        <MenuSeparator />
        <MenuItem destructive>Remove Segment</MenuItem>
      </Menu>,
    );

    const trigger = screen.getByRole("button", { name: "Show actions" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    const menu = await screen.findByRole("menu");
    const item = within(menu).getByRole("menuitem", {
      name: /Duplicate Segment/u,
    });
    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it.each([
    ["dialog", Dialog],
    ["drawer", Drawer],
  ] as const)(
    "closes a %s with Escape and restores trigger focus",
    async (_kind, Modal) => {
      render(
        <Modal
          description="Choose reusable production content."
          title="Segment Catalog"
          trigger={<Button>Open Catalog</Button>}
        >
          Catalog content
        </Modal>,
      );

      const trigger = screen.getByRole("button", { name: "Open Catalog" });
      fireEvent.click(trigger);
      const modal = await screen.findByRole("dialog", {
        name: "Segment Catalog",
      });
      expect(modal).toBeVisible();
      fireEvent.keyDown(modal, { code: "Escape", key: "Escape", keyCode: 27 });
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "Segment Catalog" }),
        ).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(trigger).toHaveFocus());
    },
  );

  it("shows tooltip content from a labelled trigger", async () => {
    render(
      <Tooltip content="Search the Segment Catalog" delayDuration={0}>
        <button type="button">Search</button>
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Search" });
    trigger.focus();
    fireEvent.focus(trigger);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Search the Segment Catalog",
    );
  });
});

describe("foundational layout and feedback", () => {
  it("renders badges, panels, dividers, skeletons, and save states", () => {
    render(
      <Panel actions={<Button size="small">Edit</Button>} heading="Validation">
        <Badge icon="check" tone="success">
          Ready
        </Badge>
        <Divider />
        <Skeleton label="Loading validation" />
        <SaveStateIndicator state="saving" />
      </Panel>,
    );

    expect(screen.getByRole("heading", { name: "Validation" })).toBeVisible();
    expect(screen.getByText("Ready")).toBeVisible();
    expect(screen.getByRole("separator")).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Loading validation" }),
    ).toBeVisible();
    expect(screen.getByText("Saving…")).toHaveAttribute("aria-live", "polite");
  });

  it("renders the required empty-state structure and decorative icons", () => {
    render(
      <EmptyState
        action={<Button variant="primary">Add First Segment</Button>}
        description="Add reusable Segments in the order they usually occur."
        heading="Design your Show's default Storyboard"
        icon="plus"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Design your Show's default Storyboard",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Add First Segment" }),
    ).toBeVisible();
    expect(document.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("supports explicitly labelled standalone icons", () => {
    render(<Icon label="Saved" name="save" />);
    expect(screen.getByRole("img", { name: "Saved" })).toBeVisible();
  });
});
