---
id: TASK-48
title: Follow /color in the active pane tab and border
status: To Do
assignee: []
created_date: '2026-10-05 21:29'
updated_date: '2026-10-06 10:24'
labels: []
dependencies: []
type: bug
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The active pane tab and the pane border ignore the session /color and stay in the permission colour.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Tab and border use the session accent

<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Checked on main d050055: the active tab follows /color; the pane border is drawn by the engine and keeps its own colour, so the task stays open.
<!-- SECTION:NOTES:END -->
