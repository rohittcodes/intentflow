# Revamp: Modern Infrastructure Workflow Builder

## Goal Description
Redesign the **Workflow Builder UI/UX** to achieve a premium, state-of-the-art "modern infra" feel. This involves a structural overhaul of the page layout, consolidation of property panels, and modernization of the design language (colors, typography, transitions).

## User Review Required
> [!IMPORTANT]
> The sidebar and panel layouts will change significantly. I am moving towards a **collapsible multi-mode sidebar** and a **unified property inspector**. This maximizes canvas space and follows standard infrastructure tools (like GCP, AWS, or modern IDEs).

## Proposed Changes

### Page Structure & Layout
#### [MODIFY] [WorkflowBuilder.tsx](file:///c:/Users/rohit/projects/cllg/intentflow/components/app/(home)/sections/workflow-builder/WorkflowBuilder.tsx)
- Reorganize the top-level grid:
  - **Top Bar**: Fixed header with breadcrumbs and primary actions.
  - **Left Sidebar**: Icon-based navigation bar + collapsible expansion panel for node dragging and settings.
  - **Canvas Area**: Large workspace with modernized background grid.
  - **Floating Toolbar**: Centralized execution controls (Run/Stop/Scale) at the bottom.
  - **Right Inspector**: Unified, glassmorphic panel for node and edge properties.

### Component Modernization
#### [MODIFY] [NodePanel.tsx](file:///c:/Users/rohit/projects/cllg/intentflow/components/app/(home)/sections/workflow-builder/NodePanel.tsx)
- Wrap node panels in a standard `Drawer` or `Sheet` pattern.
- Implement tabs: **General**, **Configuration**, **Advanced**.
- Standardize the "Variable Reference" picker across all panels.

#### [MODIFY] [CustomNodes.tsx](file:///c:/Users/rohit/projects/cllg/intentflow/components/app/(home)/sections/workflow-builder/CustomNodes.tsx)
- Refine node design: Subtle borders, high-quality icons, and improved execution status animations.
- Implement a "Selection Ring" consistent with modern design systems.

### Design System
- **Colors**: Move from generic grays to a curated palette (e.g., Deep Slate, Heat Orange, Zinc White).
- **Glassmorphism**: Apply `backdrop-blur` and semi-transparent backgrounds to floating panels.
- **Typography**: Standardize using Inter/Outfit for all UI elements.

## Verification Plan

### Manual Verification
- Verify sidebar collapsibility and mode switching.
- Test "Run" flow from the new floating toolbar.
- Ensure the property inspector correctly updates based on node selection.
- Check responsiveness across different screen sizes (specifically the collapsible elements).
