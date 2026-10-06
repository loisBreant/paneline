---
id: TASK-51
title: Scroll smoothly into diagrams under full CPU load
status: To Do
assignee: []
created_date: '2026-10-06 10:33'
labels: []
dependencies: []
type: bug
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
With all CPU cores busy, scrolling into a drawn diagram jerks for a moment. The drawings are cached, but the engine asks the plugin for many hooks on the first scroll.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Scrolling into a diagram does not jerk with all CPU cores busy
- [ ] #2 Hook time on the first scroll is close to the time without the plugin
<!-- AC:END -->
