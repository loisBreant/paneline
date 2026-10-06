---
id: TASK-40
title: Cut pane text by display width
status: To Do
assignee: []
created_date: '2026-10-05 21:29'
updated_date: '2026-10-06 10:33'
labels: []
dependencies: []
type: bug
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Activity and Files tabs cut text by display width. The shared clip helper in pane-kit still cuts by string length, so wide characters overflow where it is used.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Clip cuts by cell width

<!-- AC:END -->
