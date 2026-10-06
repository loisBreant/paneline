---
id: TASK-19
title: Refactor the modules and rename the plugin to paneline
status: Done
assignee: []
created_date: '2026-10-05 18:47'
updated_date: '2026-10-05 18:47'
labels: []
milestone: m-0
dependencies: []
type: chore
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Split event wiring and the file tree model into focused modules, drop dead exports, and publish under the name paneline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Event wiring is split into activity, session and chat modules
- [x] #2 File tree model is separate from its drawing
- [x] #3 Unused exports and single-use helpers are removed
- [x] #4 The plugin id and name are paneline
<!-- AC:END -->
