Status: in progress
Branch: chrome-tab-modifier@feat/group-max-tabs

# Handoff: upstream "Max tabs per group" to furybee/chrome-tab-modifier

This file is a temporary commit: drop it before opening the PR (see Next).

## Current state
- Branch based on upstream master; history: `git log --oneline upstream/master..HEAD`.
  The first commit holds the feature; the commits marked `wip:` on top of it are to be squashed into it.
- Feature: per-group "Close extra tabs" toggle + "Keep at most N tabs" (`GroupForm.vue`), stored as
  `Group.max_tabs` (`src/common/types.ts`), 0 or missing = unlimited.
- Closing rule shared by background and form: `_tabsBeyondMax` in `src/common/helpers.ts`
  (least recently accessed first, never the active tab nor the tab just grouped).
- Background: `TabGroupsService.enforceMaxTabs`, run when a rule adds a tab to a group.
- Options page: `trimOpenGroups` in `GroupForm.vue` asks a `confirm()` on save, then closes open
  tabs beyond the limit in groups with the same title.
- Docs: Help page "Group" section (`HelpPane.vue`) and README feature list.
- Checks: `npx vitest run`, `npm run lint`, `npm run format:check`, `npm run tsc`, `npm run build-zip`
  (all passed at the last wip commit). Built extension: `dist/` (load unpacked), `tabee.zip`.

## Decisions (by the user)
- Default unlimited, opt-in only: existing groups must never start closing tabs after an upgrade.
- Toggle + number field over a preset select (after a UI and a UX review): the label must say tabs
  get closed, and the warning line is always visible when the limit is on.
- Saving a limit asks before closing tabs already open beyond it; Cancel saves without closing.
- Branch name `feat/group-max-tabs` follows upstream's `type/kebab-slug` naming
  (`gh pr list --repo furybee/chrome-tab-modifier --state merged --json headRefName`).
- Upstream commit message carries no model-name line.
- Issue first, then PR: most upstream feat PRs say "Closes #NNN"; earlier request #149
  was closed without details on the decision.

## Rejected
- Native `<select>` with presets 1-5 + "More…": clashed with the house `CustomSelect`, hid the
  destructive effect, 8 entries for one integer.
- Default 5: would close tabs in every existing group after upgrade.

## Known limits
- Groups are matched by title: renaming a group then saving a limit does not trim groups still
  open under the old title.
- No component test for `GroupForm.vue` (no `@vue/test-utils` in the project); the confirm flow is
  covered only by manual testing.

## Open items
- USER: a week of real-life testing of the built extension. Checklist: toggle on/off; clear the
  number then save (= unlimited); save a limit on a group already over it (OK closes oldest,
  Cancel closes none); same title in two windows; active tab never closed.
- AGENT, after testing: drop this handoff commit, squash the rest into one commit with the message
  below, rerun the checks, rebuild `dist/`.
- USER: open the issue (text below), then push and open the PR referencing it.

## Squashed commit message
```
feat(groups): max tabs per group, closing least recently accessed

New per-group "Close extra tabs" option: keep at most N tabs, closing the
least recently accessed ones; the active tab and the tab just grouped are
never closed. Off by default, so existing groups are unaffected. Saving a
limit asks before closing tabs already open beyond it.
```

## Issue draft
Title: `Feature: max tabs per tab group (close least recently used)`

```markdown
### Expected behavior

A per-group option in the group form to keep at most N tabs. When a rule adds a tab to a group that is already at its limit, Tabee closes the least recently accessed tabs of that group to get back to the limit.

- Off by default, so existing groups behave exactly as today.
- The active tab and the tab that just joined the group are never closed.

### Actual behavior

Groups grow without limit. The only built-in cap is *Unique tab*, which keeps a single tab.

### Use case

Research groups (Stack Overflow, docs, issue trackers) quickly grow to dozens of tabs. With a cap such as 5, the group keeps only the most recent pages.

I have an implementation ready that I'm using locally. I added tests and an entry on the Help page, and will open the related PR.

### Side note

While searching for similar issues I found #149, which asked for a tab limit per domain. It was closed without details on the decision, so I opened this one for the tab-group variant, with a related PR.
```

## PR draft
Title: `feat(groups): max tabs per group, closing least recently accessed`

```markdown
Closes #<issue>.

## Feature
- Group form: **Close extra tabs** toggle (off by default) + "Keep at most N tabs", with a visible warning line.
- When a rule adds a tab to a group over its limit, the least recently accessed tabs of that group close. Never the active tab or the tab just grouped.
- Saving a limit on a group already open beyond it asks for confirmation before closing the extra tabs.
- Existing groups are unaffected (missing value = unlimited).

## Implementation
- `Group.max_tabs?: number` (0 or missing = unlimited).
- `_tabsBeyondMax` (helpers) shared by `TabGroupsService.enforceMaxTabs` and the group form.
- Help page and README updated.

## Tests
- <fill: vitest totals, lint, prettier, vue-tsc, build results>
- Manual: <fill from the testing week>
```

## Next
Resume prompt:
1. Read HANDOFF-max-tabs.md on branch feat/group-max-tabs.
2. Drop the handoff commit; squash the remaining commits into one with "Squashed commit message".
3. Run vitest, lint, format:check, tsc, build-zip; report results.
4. Give the push command; the user opens the issue then the PR from the drafts.
