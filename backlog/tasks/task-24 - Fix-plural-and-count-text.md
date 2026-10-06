---
id: TASK-24
title: Fix plural and count text
status: To Do
assignee: []
created_date: '2026-10-05 18:47'
updated_date: '2026-10-06 10:33'
labels: []
dependencies: []
type: bug
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The pane used to print "1 files" and "+0 -0". A single file now reads "1 file". Zero changes are still printed as +0 -0 in the Activity tab.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A single file reads "1 file"
- [ ] #2 Zero changes are not printed as +0 -0
<!-- AC:END -->
