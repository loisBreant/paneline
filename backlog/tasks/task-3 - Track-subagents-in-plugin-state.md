---
id: TASK-3
title: Track subagents in plugin state
status: Done
assignee: []
created_date: '2026-10-05 18:46'
updated_date: '2026-10-05 18:46'
labels: []
milestone: m-0
dependencies: []
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A pure tree model and a hook layer record every subagent with status, tokens and timing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Agent tree model is pure and unit tested
- [x] #2 Tracker hooks write batched state updates
- [x] #3 Polling runs only while the Agents tab is visible
<!-- AC:END -->
