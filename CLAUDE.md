# CLAUDE.md

## Tech Stack
- Plain HTML, CSS, and JavaScript only.
- No frameworks and no build step: files open directly in a browser.

## Project Structure
- `README.md` — project readme
- `CLAUDE.md` — this file
- `index.html` — portal homepage
- `css/styles.css` — shared styles and the light/dark colors
- `js/theme.js` — light/dark toggle, shared by every page
- `tools/tool-1/index.html` — placeholder tool page (to be replaced by the first real tool)

Update this section as files and folders are added.

## Key Requirements
1. Every page must be responsive and work on desktop, tablet, and phone.
2. Users can toggle between a light and a dark theme. The default is the light theme.
3. Text must stay easy to read, with good contrast, in both the light and the dark theme.

## Feature Plan
A portal where students try small tools for Business Process Management.

### Portal structure
- **Homepage** (`index.html`): a short intro plus one card per tool.
- **Opening a tool:** the visitor clicks a tool's card and lands on that tool's own page, `tools/<tool-name>/index.html`.
- **Getting back:** every tool page has a "Back to portal" link in its header, next to the theme toggle.
- **Adding a tool later:** create a new folder under `tools/` and add one card to the homepage. Nothing else changes.

### Phases
1. **Phase 1: the portal plus its first tool.**
   - Portal: homepage, shared styles, light/dark toggle. **Done:** homepage with a placeholder "Tool 1 — coming soon" card that opens its page and returns via "Back to portal". Styling is deliberately plain and neutral until a visual design is chosen.
   - First tool: a process flow diagram builder. The student types one step per line, and a flowchart is drawn on the page.
   - Exactly one tool in this phase.
2. **Phase 2: more tools.** Add further tools one at a time. Which ones is still to be decided.

## Rules for Claude
- Explain technical terms in plain language.
- Ask before making big changes.
- Ask rather than guess when something is unclear.
