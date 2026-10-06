---
id: TASK-1
title: Render faster with caches and a linear markdown parser
status: Done
assignee: []
created_date: '2026-10-05 18:46'
updated_date: '2026-10-05 18:46'
labels: []
milestone: m-0
dependencies: []
type: enhancement
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cache reply, user and tool-group drawings and parse markdown in one pass so long chats stay smooth.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Reply and user message drawings are cached between renders
- [x] #2 Markdown parser is linear and handles nested fences, raw blocks and tables
- [x] #3 An opt-in probe logs render timings
<!-- AC:END -->
