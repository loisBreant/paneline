---
id: TASK-15
title: Count subagent and merge changes in the Files tab
status: Done
assignee: []
created_date: '2026-10-05 18:47'
updated_date: '2026-10-05 18:47'
labels: []
milestone: m-0
dependencies: []
type: feature
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The tree includes edits made by subagents and changes that land through merge, rebase or pull.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Subagent edits are counted with a summary of who changed what
- [x] #2 Changes from git merge, rebase and pull are counted
- [x] #3 The git diff base is the HEAD at session start, read from the reflog
<!-- AC:END -->
