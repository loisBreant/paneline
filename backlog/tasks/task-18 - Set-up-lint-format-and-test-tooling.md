---
id: TASK-18
title: 'Set up lint, format and test tooling'
status: Done
assignee: []
created_date: '2026-10-05 18:47'
updated_date: '2026-10-05 18:47'
labels: []
milestone: m-0
dependencies: []
type: chore
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ESLint, Prettier, TypeScript, husky and lint-staged guard every commit.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 npm run check runs lint, format check, typecheck and tests
- [x] #2 A pre-commit hook runs lint-staged
- [x] #3 Existing sources pass lint
<!-- AC:END -->
