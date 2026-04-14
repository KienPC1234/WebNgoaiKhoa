# CMS Hybrid Editor Spec

## Goals
- Production-ready hybrid editor: rich text + layout builder.
- Block-based architecture with JSON versioned document.
- Headless core separated from editor interactions and renderer.

## Layered Architecture
1. Document model/schema layer
- Types: document, block, table model.
- Validation: schema validation per document and per block.
- Serialization/deserialization + migrations.

2. Editor interaction layer
- Canvas state via reducer.
- Selection, drag/drop, command system.
- Inspector, inline controls, slash insert.
- Undo/redo and autosave.

3. Renderer layer
- Deterministic rendering from JSON.
- Shared block registry with editor for consistency.
- Responsive rules for columns/grid/sidebar.

## Data Flow
- User action -> command/action dispatch -> reducer updates document -> validation -> autosave queue.
- Preview and publish renderer consume same JSON document.
- Block renderer lookup is registry-driven.

## Document Model
- Document
  - version
  - id
  - type
  - title
  - blocks
  - metadata
- Block
  - id
  - type
  - props
  - children

## Table Model
- `TableModel` has rows with `TableCell`.
- `TableCell` supports rowSpan/colSpan/header/style.
- Merge/split operations normalize structure safely.

## Required Modules
- core/model, schema, registry, validation
- core/serialization + migration
- editor/state, selection, history, autosave
- commands registry/palette
- plugins/layout + plugins/table
- inspector panel
- renderer components

## Extensibility
- New block only needs a block definition registration.
- Core reducer/renderer stays unchanged.
- Versioned migrations convert old docs to latest schema.
