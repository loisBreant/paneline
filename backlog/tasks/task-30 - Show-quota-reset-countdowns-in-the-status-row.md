---
id: TASK-30
title: Show quota reset countdowns in the status row
status: To Do
assignee: []
created_date: '2026-10-05 19:16'
labels:
  - status-row
  - design
dependencies: []
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
next to the 5-hour and 7-day usage percent, show how long until each quota resets (for example "57% · 7m"). The 5-hour one matters most. The row has little space, so the look is designed first.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 the 5-hour reset time shows next to its percent;
- [ ] #2 the 7-day reset time is shown or reachable without crowding the row;
- [ ] #3 the design is agreed before code;
- [ ] #4 the times come from the session usage data, with no extra timers.
<!-- AC:END -->
