# ZOE Agentarium — Ultra-Premium, Chat-First UX Redesign
## Implementation master prompt for Antigravity / Codex

You are the lead product designer, accessibility engineer, frontend architect, and implementation engineer for ZOE Agentarium, an AI-native Money Services Business (MSB) workspace. Redesign the **existing** application, not a separate mockup, with the refinement of a premium enterprise product. Preserve functioning modules, routes, workflow definitions, data, permissions, and integrations.

## The problem to solve

The current four-panel ZOE MSB interface contains useful business information but creates cognitive overload on ordinary 14-inch laptop displays. The central ZOE conversation feels like another narrow chat sidebar rather than the primary interface. The workflow canvas can become unusable when squeezed into a thin fourth panel.

**Design direction: retain the useful business information; progressively disclose it. ZOE Chat must be the visual and interaction priority.** A user should know what to do within five seconds of opening any module.

Target: a premium, calm, light-themed financial operating environment, not a dense cockpit or a decorative sci-fi dashboard. Use Malaysian green and white, sophisticated typography, exquisite spacing, considered motion, and credible operational data.

## Non-negotiable product principles

1. **Conversation first.** ZOE is the primary control surface. Business views are contextual, and workflows are inspectable tools—not competing home screens.
2. **Four-panel architecture, adaptive presentation.** Maintain Navigation, Business Application, ZOE Chat, Workflow/Activity as independently stateful surfaces, but **do not force all four to be fully expanded at 1366 × 768**.
3. **Keep business information.** Preserve rates, transactions, exceptions, audit records, approvals, dashboard metrics, evidence, and operations. Replace clutter with summaries, tabs, search, disclosure, and drilldowns—never deletion.
4. **Usable at 14 inches.** Optimize for actual viewport dimensions (especially 1280×720, 1366×768, 1440×900 at 100% and 125% browser zoom), not physical screen size alone.
5. **Trustworthy financial UX.** Approvals, permissions, synthetic/live data badges, workflow versions, and audit trails must remain unambiguous. Never label simulated records as live BNM feeds.
6. **Production code, not a static HTML imitation.** Audit the existing frontend and make integrated, testable changes. Avoid replacing real Flow Foundry or business views with decorative diagrams.

## Information architecture and responsive panel system

### Four persistent logical workspaces

- **Panel 1 — Navigation:** Application hierarchy, module switching, active context, compact app launcher.
- **Panel 2 — Business Application:** Operational rates, order tables, counters, pricing exceptions, audits, dashboards, approvals.
- **Panel 3 — ZOE Conversation:** The primary workspace, visible and usable in all common desktop modes.
- **Panel 4 — Workflow / Activity:** Exactly two principal tabs. Workflow opens the actual Flow Foundry view for the selected workflow. Activity shows real or explicitly simulated execution and audit events.

Use `react-resizable-panels` or an existing proven equivalent. Panels need their own scroll containers, drag handles, collapse/expand controls, keyboard-resizable handles, and persisted layout preferences. No document-level scrolling on desktop. Do not reinitialize chat or graph state when panels move.

### Responsive behavior (starting targets, refine through testing)

**Wide desktop ≥1600 px:** Show all four full panels when users choose Operations mode. Typical starting widths: navigation 70–210 px, application 340–450 px, ZOE Chat **at least 520 px**, Workflow/Activity 310–400 px. User can resize.

**14-inch laptop / 1280–1599 px:** Default to **Focus mode**. Collapse navigation to a 60–68 px icon rail; show the business application at approximately 340–400 px; give the remaining major width to ZOE Chat; show Workflow/Activity as a narrow rail or collapsed drawer. Opening Workflow displays an overlay, temporary neighboring workspace, or expanded canvas **without reducing ZOE Chat below 480 px**. Never cram four full-width dashboards on the page.

**Small laptop/tablet / 900–1279 px:** Use an icon navigation rail, ZOE Chat as the principal surface, and Business/Workflow as switchable contextual drawers or tabs. Preserve conversation context.

**≤899 px:** A chat-first single primary canvas with accessible navigation, business information, and workflow via sheets or dedicated views. Do not pretend four columns remain usable.

Provide optional workspace presets: **Focus** (default), **Operations**, **Workflow**, and **Custom**. The user's last chosen configuration persists. A single obvious “Reset layout” control restores sane defaults.

## Ultra-premium visual direction

Create a distinctive ZOE design language—not a clone of ChatGPT, Linear, Dify, or n8n.

- Palette: deep green `#075E49`, emerald `#0A8F6A`, dark ink `#102D28`, pearl white `#FFFFFF`, mint-tinted canvas `#F6FAF8`, subtle borders `#DCEAE4`. Semantic amber/red reserved for warnings and failures.
- Typography: Geist, Inter, or existing compatible UI fonts; consistent number tabulation for rates; clearly separated heading, body, caption, and metadata scales.
- Surfaces: quiet rounded corners (12–18 px), thin hairline borders, occasional extremely soft elevation, no excessive shadows, excessive glass, excessive outlines, stock imagery, or gradient-filled cards.
- Spacing: robust 8 px rhythm; generous empty space within the conversation; tighter density only in operational data tables.
- Motion: 120–240 ms micro-interactions, tasteful ZOE glow, gentle active-state halo, optional waveform while listening; respect `prefers-reduced-motion` and avoid constant heavy GPU animation.
- Accessibility: readable dark text on pale surfaces, WCAG AA-oriented contrast, keyboard navigation, visible focus rings, generous targets, high-contrast status labels.

The interface should feel like a refined high-end operating system for finance rather than a collection of disjoint cards.

## Panel 3 — Make ZOE the hero

### A. Calm, useful header

Top area should have a discreet ZOE identity, current mode/state (Ready, Listening, Thinking, Executing, Needs approval), and one compact contextual indicator like `Class A · Live Board Rates` that can be opened to inspect attached data sources. Avoid stacking multiple permanent status bars.

### B. Intelligent welcome, not message spam

On the first interaction of the day, display a **single compact daily briefing** summarizing Yesterday / Today / Tomorrow with 2–3 pertinent facts or actions. It can expand into detailed business evidence. Switching modules updates a context chip or discreet summary; it **must not add another full generic welcome paragraph to chat history**.

### C. Conversation design

- Spacious and legible, with a comfortable reading column, readable multiline messages, context-aware citations to internal business records, and visually restrained role markers.
- Avoid repeated “ZOE FX copilot” prefixes, redundant timestamps, huge empty bubbles, and dozens of stacked suggestions.
- Operational responses can contain polished interactive artifacts: rate comparison cards, mini tables, exception summaries, approval cards, execution timelines, document previews, and “View in Application” actions.
- Default replies answer the business question first, then offer a collapsible **Evidence / Reasoning summary / Workflow** drilldown where appropriate. Do not reveal hidden chain-of-thought; show useful source records and decision factors.
- Show source freshness, uncertainty, and synthetic/live origin clearly.

### D. Signature ZOE orb

Give ZOE a restrained premium identity: a small dimensional green orb with a subtle breathing glow when idle, a more pronounced halo when thinking, and a clean waveform when voice capture is active. Animation reinforces system state; it does not continuously demand attention.

### E. Composer: the most refined interaction in the product

Sticky at the bottom, distinct without being huge. Comfortable multiline input and optional expand-to-compose. Include real and well-labeled controls for:

- Text input, send, enter/shift-enter behavior.
- Voice / microphone (permission-aware; show recording/transcription status and stop).
- Attachment upload (file/image), camera capture where supported.
- Current business record / workflow context attachment.
- Auto / Quick / Deep request mode if the backend supports it.
- Stop generating, retry, edit message, reuse a previous request.
- Contextual quick actions: “Explain this rate”, “Show pending approvals”, “Inspect WF-16”, “Propose a rule change”. Show only relevant actions.

Prefer one plus-menu or compact action cluster rather than permanently displaying every tool. Every control must do something real or be transparently marked unavailable/demo.


### F. Premium ZOE motion system — build, do not merely describe

Implement ZOE's signature **Luminous Intelligence** motion language with accessible, high-performance animations. The visual should feel like an intelligent agent responding to the user, never like a noisy game UI:

- **Idle:** multi-layered emerald/pearl orb, extremely soft breathing halo on a 5–7 second cycle; quiet composer border with a faint drifting light only when idle in the conversation workspace.
- **Listening:** clearly labelled recording/transcription state, animated five-bar waveform synced to audio amplitude where audio capture permits (otherwise show a clearly non-reactive status indicator), halo intensity rises; obvious Stop control. Never imply recording unless a real microphone session is active.
- **Understanding / planning:** light moves across the orb and composer rim, status label changes, a short three-dot or small waveform progress indicator appears. Avoid fake progress percentages.
- **Executing:** purposeful, low-intensity activity sweep; when workflow events arrive, animate only the relevant step/edge and show the current action in an accessible text status.
- **Awaiting approval:** amber focus ring and stable decision card with approve/reject actions appropriate to permissions; no blinking alarms.
- **Completed / failed:** 300–500 ms transition into calm success/error state; do not leave permanent bright pulsing effects.
- **Messages:** 160–240 ms fade/translate entrance, no excessive bubble bounces; maintain proper scroll anchoring and respect user scroll position.
- **Composer:** precise 1–2 px animated gradient hairline halo along the rounded border; soft ambient shadow when focused; a very subtle radial wash behind the input, with no glowing text or reduced contrast.
- **Microinteractions:** 120–220 ms hover, focus, button acknowledgment and panel transitions. Keep animation on transform/opacity where possible; animate box-shadow sparingly on small surfaces only.
- **Customization:** Soft / Focus / Off glow intensity, persisted per user; Off disables decorative animation without hiding system statuses.
- **Accessibility & power:** `prefers-reduced-motion`, optional battery-saver mode, visibility-based animation suspension, WCAG AA text contrast, keyboard equivalents and live status announcements. Test FPS and input latency on a 14-inch laptop.

Provide real state wiring to ZOE events; synthetic demos must visibly say they are simulated. The premium glow must be clearest around the **ZOE orb and composer**, not all four panels.

## Panel 2 — Business information remains complete but less intrusive

Keep Exchange Counter, Orders & Receipts, Live Board Rates and any additional operational modules. Use overview-on-demand rather than showing every KPI, rate card and table simultaneously.

For Live Board Rates retain all six rate pairs (USD/MYR, SGD/MYR, EUR/MYR, GBP/MYR, INR/MYR, JPY/MYR), approved selling and buying rates, proposal actions, approval status, active version, counter synchronization, exception details, audit history, and transaction context.

At 14-inch dimensions, show a compact page header, 2–3 prioritized summary signals, and a scannable rates list/grid; place less urgent metrics behind “View details”. Include targeted search, filters, status tags, and drilldown drawers. Preserve all data and actions even when they are not visible above the fold.

Avoid misleading buttons such as “New Transaction” in a page that should show “Rate Proposal” unless that is genuinely the correct business action.

## Panel 4 — Actual Flow Foundry + Activity

The rightmost surface has **only Workflow and Activity as its main tabs**. Clicking Workflow must open the genuine Flow Foundry representation of the selected workflow, not an invented HTML diagram or a duplicate stage list.

Current example route (audit its actual validity and workflow ID):
`http://127.0.0.1:5175/msb/class/A/workflows/WF-16-`

**Compact:** Show a legible business-level overview and “Expand workflow” affordance. Do not shrink a 30-node graph into unreadable micro-text. 

**Inspect:** Open focused node information, execution evidence, approval reason, inputs/outputs, errors, and audit trail. 

**Expanded Edit:** Use a generously sized canvas, preferably by temporarily reclaiming the business application area while **keeping ZOE Chat present**. Include drag/drop, search, minimap, zoom, Fit, automatic layout, node configuration, undo/redo, and workflow versioning if supported by the existing stack.

Audit whether the existing Flow Foundry uses `@xyflow/react` already. If so enhance it; otherwise evaluate React Flow UI with ELKjs. React Flow is a visual layer, not the execution engine. Never replace backend workflow definitions or omit approval gates just for visual polish.

Graph fitting: explicit container dimensions, ResizeObserver, initial fit after nodes are measured, targeted fit on a deliberate resize, no auto-fit while users are dragging/panning/zooming, no unprompted destruction of custom node positions. For an iframe use checked-origin `postMessage` bridging, and provide an embedded-view error/retry/new-tab fallback when localhost is unavailable or framing is blocked.

Activity: show an intelligible chronological event timeline grouped by task, with status, actor, timestamp, workflow ID, exception reason, and evidence link. Allow a user to select an event to inspect it in Business Application or Workflow without losing chat state.


## Research-backed Flow Foundry canvas modernisation — React Flow + UI + ELKjs

**Core architectural decision:** React Flow (`@xyflow/react`) is the interactive visual editing layer; it **does not replace** the existing workflow execution engine, scheduling, integration adapters, approvals, version history or audit data. Audit the current Flow Foundry first and reuse React Flow if already present. Do not create a second competing workflow UI if the existing editor can be upgraded.

### Reference products and what to learn from them

| Reference | Adopt for ZOE | Avoid |
|---|---|---|
| [React Flow Workflow Editor](https://reactflow.dev/ui/templates/workflow-editor) | Drag-and-drop, premium custom nodes, selection, editor layout | Copying example appearance unchanged |
| [React Flow AI Workflow Editor](https://reactflow.dev/ui/templates/ai-workflow-editor) | Conversation-assisted graph manipulation and React state integration | Claiming built-in AI orchestration handles banking controls |
| [React Flow Turbo Flow](https://reactflow.dev/examples/styling/turbo-flow) | Restrained glowing active-node boundaries and execution edges | Animating every node permanently |
| [ELKjs layout example](https://reactflow.dev/examples/layout/elkjs) | Readable multi-branch automatic arrangement | Rearranging manually positioned nodes on each resize |
| [Dify Workflows](https://dify.ai/workflows) | LLM node settings, structured variables, debugging ergonomics | Replacing existing ZOE runtime |
| [n8n](https://n8n.io/) | Execution trace, retry, errors, input/output inspection | Overloaded controls in compact mode |
| [Rete.js](https://retejs.org/docs/) | Alternative for advanced visual-programming semantics | Switching libraries without a concrete reason |
| [AntV X6](https://x6.antv.antgroup.com/) / [GoJS](https://gojs.net/) | Evaluate only if React Flow cannot satisfy proven scale/diagramming needs | Premature library migrations |

Check licence, dependency/version compatibility and Pro example requirements before bringing examples into proprietary ZOE code. Prefer React Flow UI and existing `shadcn/ui` primitives where they fit the project.

### Proposed editor stack

- `@xyflow/react` for graph viewport, nodes/edges, handles, selection, drag/drop, minimap, controls and connection validation.
- React Flow UI or existing component library for node designs and contextual toolbars; do not duplicate a second design system.
- `elkjs` for DAG/branch auto-layout, including source/target handles and variable node dimensions; evaluate ELK over Dagre for complex branches.
- Existing state architecture (Zustand if in project) for graph drafts, selection, execution overlays, undo/redo, viewport persistence and AI proposals.
- Typed, versioned graph JSON with node contracts, edge contracts, config schemas, semantic status, source attribution, and approval metadata; map to existing engine through a tested adapter.
- Backend validators for structural correctness, business permissions, maker–checker policy, safe graph edits, traceability and deterministic execution.

### Custom node system

Create accessible, consistent node templates for Trigger, Cash/FX Action, API/Data Source, AI Agent, Decision, Branch, Human Approval, Compliance Validation, Notification, Audit Evidence, Error Handler, Workflow Output. Each should expose a concise title, category icon, connection ports, short status, optional validation/error badge and Expand Inspector action. Avoid placing full forms inside every node; edit settings in the inspector.

Use a restrained semantic motion system: emerald edge tracing only during actual workflow execution, amber approval gates when pending, subtle cyan/teal for data retrieval, clear red for failure. Never use ambient effects to imply a node successfully ran if execution data is absent. Support small 7-node workflows as well as 30–100+ nodes with efficient rendering and event handling.

### Three adaptive canvas modes

1. **Overview:** When the Workflow dock is narrow, show a business-level summary of stages and topology. Use legible grouped nodes or a semantic overview; do not fit everything into unreadable miniature nodes. Allow click-to-focus and Expand.
2. **Inspect:** Focus selected node/edge, input/output evidence, status, exceptions and approval reason. Keep the graph visible, provide breadcrumb and jump-to-dependency, no accidental editing.
3. **Edit:** Expand to a dedicated, roomy canvas with ZOE Chat alongside. Enable node library search, connect/reconnect, config inspector, undo/redo, auto-arrange, minimap, fit, zoom, keyboard and mouse interactions, validate, draft save, review changes, publish approval controls.

Use `ResizeObserver` on a canvas container with explicit measurable dimensions. Call `fitView` at initial load **after nodes are measured**, and on explicit Fit actions. A resize may trigger a context-sensitive fit if the user has not manually panned/zoomed; never repeatedly override user viewport or rewrite saved node positions. Use pan/zoom bounds, node focus and minimap for large graphs. No direct CSS scale hack on the entire iframe.

### ZOE Chat ↔ Flow Foundry interaction contract

Keep a single canonical workflow graph model. ZOE makes a **validated proposal**, not an unapproved mutation. Support user language such as: “Add a second manager approval for USD/MYR margin overrides” and show graph diff (added/removed/modified nodes and edges), plain-language impact, new permissions and business-rule validation. The user accepts/rejects/refines the proposal. Save a versioned draft separately from publishing. Require appropriate approval for live effects.

If the Flow Foundry editor is embedded cross-origin, use `postMessage` with exact allowed origins, nonce/handshake, `event.source` checking, typed/versioned message envelopes and a trusted app registry. Suggested requests: `ZOE_FLOW_READY`, `ZOE_SET_VIEW_MODE`, `ZOE_FIT_VIEW`, `ZOE_FOCUS_NODE`, `ZOE_GRAPH_PROPOSAL_PREVIEW`, `ZOE_GRAPH_DIFF`, `ZOE_PANEL_RESIZED`; acknowledge successes/failures. Do not assume posting a message guarantees the receiver performed the action. If iframe framing is blocked, use a full in-app route or open-in-editor fallback. Route `http://127.0.0.1:5175/msb/class/A/workflows/WF-16-` must be verified against real routing rather than guessed or silently corrected.

### Acceptance scenarios specific to Flow Foundry

- WF-16 opens as the actual editor when the Workflow tab is selected; Activity remains separate.
- 1366×768 Focus view shows a readable compact workflow while ZOE retains the primary usable space.
- Expanded Edit provides a full graph inspector and chat together, without losing message history, node positions or unsaved edits.
- Fit/zoom/auto-layout operate predictably on 7-, 30- and 100+-node fixtures; manual graph edits survive collapse/expand.
- LLM-generated graph proposals are reviewable and permission-checked before any stored or live change.
- Animations reflect real statuses, respect reduced motion, and do not impair dragging or the 14-inch laptop experience.
- The UI works when the Flow Foundry server is stopped, blocked by frame policy or unavailable: useful error and open-editor fallback; ZOE Chat continues to work.

## Natural-language workflow intelligence

A request like “Review USD/MYR pricing and add a manager approval before publication when the spread exceeds tolerance” should:

1. Identify the current module and retrieve the relevant approved template or draft (e.g. WF-16).
2. Interpret intent and propose a typed, validated graph change.
3. Highlight additions, removals and modified edges on the actual Flow Foundry canvas.
4. Explain the change in plain business language in ZOE Chat.
5. Ask for required human approval before saving/publishing or touching live business systems.
6. Save the approved draft with version metadata and audit evidence; distinguish draft/save/production publish.
7. Preserve chat history, graph selection, and unsaved user changes while switching panels.

No false claims about completed execution, real bank activity, regulatory approval, or data source availability.

## Practical UI components

Implement reusable pieces, adapted to existing code:

- `AdaptiveWorkspaceShell`, `PanelResizeHandle`, `WorkspacePresetSwitcher`, `CollapsibleNavRail`.
- `BusinessContextHeader`, `KpiSummaryStrip`, `FxRatesList`, `RateDetailDrawer`, `ApprovalCard`.
- `ZoePresenceOrb`, `ZoeContextChip`, `DailyBriefing`, `ConversationStream`, `EvidenceCard`, `ZoeComposer`, `VoiceCaptureControl`.
- `WorkflowActivityDock`, `EmbeddedFlowFoundry`, `WorkflowOverview`, `WorkflowInspector`, `ActivityTimeline`.

Use existing project conventions and shared primitives rather than introducing unnecessary new dependencies.

## Implementation order

**1 — Audit:** Find existing panel code, ZOE chat state, workflow renderer and server route, installed graph libraries, CSS breakpoints, synthetic-data feed and tests. Record current state.

**2 — Design system:** Implement tokens, responsive layout, reusable panel interactions, semantic typography and accessibility.

**3 — Chat-first shell:** Prioritize ZOE space, clean up repeated welcome messages, implement stateful composer and daily briefing.

**4 — Business panels:** Keep data and actions; improve rate-card information density, drilldowns and responsiveness.

**5 — Flow Foundry:** Real integration, compact/expanded mode, adaptive fitting, workflow/activity split.

**6 — Cross-panel intelligence:** Context sharing, chat-to-graph proposals, workflow selection and approval-safe edits.

**7 — Verification:** Manual browser and automated tests; identify unsupported actions, performance regressions and remaining backend gaps.

## Acceptance tests

Test **1280×720**, **1366×768**, **1440×900**, **1600×900**, **1920×1080**, including **125% browser zoom**. Verify:

- Within five seconds a new user can locate the ZOE composer and understand what action to take.
- At 1366×768, the conversation has the largest and most usable interaction area; other information stays accessible without overwhelming it.
- All four logical panels work; resizing, collapse, restore, presets and persisted layout work.
- No full-page scroll, clipped controls, overlapping labels, unreadable fonts, or disappearing content.
- Existing six FX currencies, rates, approvals, audit evidence and transaction views are still reachable.
- The genuine Flow Foundry route opens; failures are handled without blanking the entire ZOE shell.
- 7-, 30-, and 100-node workflows remain navigable, and manually positioned nodes are not destroyed by automatic fitting.
- ZOE Chat retains history and focus while panels expand/collapse or while the user inspects workflows.
- Reduced motion, keyboard operation, contrast, focus and screen-reader labels are checked.
- Synthetic data remains explicitly synthetic; production actions require authorization.
- No broken navigation, JavaScript exceptions, inaccessible modal actions or regression in existing functions.

## Deliverables

Make the actual code changes and provide: modified files, a clear before/after summary, viewport screenshots where your tooling permits, integration status, tests run with outcomes, any blocked feature with reason, and the next high-priority improvement. Do not claim a feature works if it has not been validated. Do not respond with only another proposal or visual mockup.

**Final bar:** The 14-inch experience should feel like a purpose-built AI operating system with ZOE in command, not four independent websites compressed into a single browser window.
