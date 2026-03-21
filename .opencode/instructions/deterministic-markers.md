# Deterministic Frontend Markers

Apply deterministic markers to user-facing interactive surfaces using exact `data-ocid` attributes.

## Required Coverage

- Navigation controls and route-changing links/buttons (primary nav links, breadcrumbs, back/next, pagination, route menu items).
- Primary CTAs and secondary action buttons.
- Destructive CTAs/actions (`delete`, `remove`, `reset`, `disconnect`) and their confirm/cancel controls.
- Core form inputs (`input`, `textarea`, `select`) and submit buttons.
- Checkboxes, radios, switches, and other form controls that mutate UI or backend state.
- Explicit UI state surfaces for async and mutation flows (`*.loading_state`, `*.error_state`, `*.success_state`).
- List/table row containers using deterministic numeric index markers (`*.item.1`, `*.item.2`, `*.item.3`).
- Empty-state containers (`*.empty_state`) for collection-style views.
- Modal/dialog/sheet coverage:
  - Explicit open triggers (for example `*.open_modal_button`).
  - Auto-open modal/dialog containers (for example `*.dialog`, `*.modal`).
  - Resolve controls: confirm, cancel, close, and continue buttons.
- Non-modal overlays and transient surfaces (`*.popover`, `*.dropdown_menu`, `*.tooltip`, `*.toast`) with markers on actionable controls.
- File and drag interactions (`*.upload_button`, `*.dropzone`, `*.drag_handle`).
- Rich interaction targets (`*.editor`, `*.canvas_target`, `*.chart_point`, `*.map_marker`).
- Keyboard-only interaction triggers (`*.command_palette_open`) and hotkey-triggered controls.
- Tabs, filters, and key toggles that drive major UI state changes.

## Component-Aware Marker Mapping

Use the available frontend component inventory (see `shadcn-ui` `ui-summary.json`) to place markers consistently:

- Button-like primitives (`Button`, `PaginationNext`, `PaginationPrevious`, `Toggle`, `ToggleGroupItem`) -> action markers such as `*.button`, `*.primary_button`, `*.secondary_button`, `*.delete_button`, `*.toggle`, `*.pagination_next`, `*.pagination_prev`.
- Input-like primitives (`Input`, `Textarea`, `InputOTP`, `CommandInput`) -> `*.input`, `*.search_input`, `*.textarea`.
- Choice controls (`Checkbox`, `RadioGroup`, `Switch`, `Select`) -> `*.checkbox`, `*.radio`, `*.switch`, `*.select`.
- Containerized selection/navigation (`Tabs`, `NavigationMenu`, `Menubar`, `Breadcrumb`) -> `*.tab`, `*.link`.
- Dialog and layered primitives (`Dialog`, `AlertDialog`, `Sheet`, `Drawer`, `Popover`, `DropdownMenu`, `ContextMenu`, `Tooltip`) -> trigger and container markers such as `*.open_modal_button`, `*.dialog`, `*.sheet`, `*.popover`, `*.dropdown_menu`, `*.tooltip`, plus close/confirm/cancel markers.
- Collection primitives (`Table`, `Accordion`, `Collapsible`, `Carousel`) -> `*.table`, `*.row`, `*.item.1`, `*.item.2`, `*.panel`.
- Feedback primitives (`Alert`, `Sonner`, `Progress`, `Skeleton`) -> `*.error_state`, `*.success_state`, `*.loading_state`, `*.toast`.

## Naming Contract

- Marker IDs must match: `[a-z0-9]+([._-][a-z0-9]+)*`
- Keep IDs deterministic, stable, lowercase, and predictable.
- Use index-based list markers with deterministic numeric positions (`.1`, `.2`, ...), not runtime entity identifiers.
- Apply markers to all interactive surfaces users can act on. If an element is clickable/focusable and changes route, state, or data, it must have a deterministic `data-ocid`.

## Allowed Marker Vocabulary (Strict)

- Marker IDs must follow one of these forms:
  - `<scope>.<token>`
  - `<scope>.<token>.1`
  - `<scope>.<entity>.<token>`
  - `<scope>.<entity>.<token>.1`
- Numeric suffixes must be deterministic positions (`1`, `2`, ...).
- Allowed terminal `<token>` values:
  - `page`, `section`, `panel`, `card`
  - `list`, `table`, `row`, `item`, `empty_state`
  - `button`, `primary_button`, `secondary_button`, `submit_button`, `cancel_button`, `confirm_button`, `close_button`, `delete_button`, `edit_button`, `save_button`, `open_modal_button`
  - `link`, `tab`, `toggle`, `pagination_next`, `pagination_prev`
  - `input`, `search_input`, `textarea`, `select`, `checkbox`, `radio`, `switch`
  - `modal`, `dialog`, `sheet`, `popover`, `dropdown_menu`, `tooltip`, `toast`
  - `loading_state`, `error_state`, `success_state`
  - `upload_button`, `dropzone`, `drag_handle`
  - `editor`, `canvas_target`, `chart_point`, `map_marker`
  - `command_palette_open`
- Never invent terminal tokens outside this set.
- For todo-like CRUD UIs, prefer these canonical markers:
  - `todo.input`
  - `todo.add_button`
  - `todo.item.1`, `todo.item.2`
  - `todo.checkbox.1`, `todo.checkbox.2`
  - `todo.delete_button.1`, `todo.delete_button.2`
  - `todo.filter.tab`

## Selector Contract

- Primary hooks must use exact selectors: `[data-ocid="<marker-id>"]`
- Avoid wildcard, prefix, runtime-id, and fuzzy text-only selectors as primary hooks.
