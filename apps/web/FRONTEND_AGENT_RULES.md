# Frontend Agent Workflow Rules

These rules define how agents must work on ScopeForge frontend branches, especially
when multiple agents implement screens in parallel.

## Core Rule

Screen agents must not wire the app together.

Screen branches add isolated, exportable screen files. A later integration branch
owns routing, layout composition, navigation, providers, and `App.tsx`.

Backend-wiring branches are separate from screen branches. They may connect one
bounded group of already-merged screens to existing API endpoints, but they
should not redesign those screens or change unrelated routes.

## Recommended Workflow

Run screen agents first:

```text
develop
  -> feature/login-screen
  -> feature/users-roles-screen
  -> feature/dashboard-screen
```

Merge those branches into `develop`.

Then run the integration agent:

```text
develop
  -> feature/app-shell-routing
```

The integration branch connects the already-merged screens.

## Screen Branch Ownership

A screen branch may add or edit files only inside its own area.

Examples:

```text
src/pages/LoginPage.tsx
src/components/auth/*
src/types/auth.ts
src/mocks/auth.ts
```

```text
src/pages/UsersAndRolesPage.tsx
src/components/settings/users/*
src/types/users.ts
src/mocks/users.ts
```

Screen branches may:

- add one page component
- add page-specific components
- add page-specific types
- add page-specific mock data
- add page-specific tests when test setup exists

Screen branches must not:

- edit `src/app/App.tsx`
- edit `src/main.tsx`
- edit global routing
- edit app providers
- edit the app shell/sidebar/navigation
- edit global CSS unless explicitly requested
- edit `package.json` unless explicitly requested
- edit shared API clients unless explicitly requested
- change another screen's files

## Integration Branch Ownership

The integration branch owns shared app wiring.

It may edit:

```text
src/app/App.tsx
src/app/routes.ts
src/app/providers.tsx
src/components/layout/*
src/components/navigation/*
```

It may:

- add routing
- add app shell layout
- add navigation/sidebar
- connect merged screens
- add provider wrappers
- normalize screen props if needed

It must not:

- redesign individual screens
- rewrite screen internals
- add unrelated product behavior
- hide broken screen contracts instead of fixing them clearly

## Backend-Wiring Branch Ownership

Backend-wiring branches connect existing screens to existing backend APIs.

They may edit:

```text
src/api/*
src/hooks/*
src/lib/*Mapping.ts
src/types/*
src/pages/*
screen components only when a prop boundary is needed
```

They may:

- add typed API functions
- add React Query hooks
- map backend records into existing screen view models
- preserve mock fallbacks for empty workspaces
- add loading and error states around existing screens

They must not:

- add backend endpoints
- redesign screen visuals
- combine unrelated product areas in one branch unless explicitly assigned
- remove mock fallbacks before the backend has complete data coverage
- mutate backend data unless the PR scope explicitly includes that workflow

Recommended backend-wiring split:

```text
feature/approvals-backend-wiring
feature/evidence-findings-wiring
feature/reports-memory-wiring
feature/admin-analytics-wiring
```

## Shared Components

If multiple screens need the same primitive, create a separate branch first.

Examples:

```text
feature/ui-primitives
feature/table-primitives
feature/form-primitives
```

That branch may add shared components such as:

```text
src/components/ui/Button.tsx
src/components/ui/Input.tsx
src/components/ui/PageHeader.tsx
src/components/ui/Badge.tsx
```

Screen branches should reuse merged shared primitives instead of inventing their
own versions.

## Branch Rules

All normal frontend branches start from the latest `develop`:

```powershell
git switch develop
git pull --ff-only origin develop
git switch -c feature/screen-name
```

Do not branch normal frontend work from another feature branch.

If a branch accidentally contains another screen's files, stop and split the work
before opening a pull request.

## Commit Rules

Commits must be small and atomic.

Good commits:

```text
feat: add login page component
feat: add login form component
test: add login form validation tests
```

Bad commits:

```text
feat: add login and users screens
feat: add dashboard and update app routing
feat: add settings page and refactor global styles
```

Never use:

```powershell
git add .
```

Use explicit staging:

```powershell
git add apps/web/src/pages/LoginPage.tsx
git add apps/web/src/components/auth/LoginForm.tsx
```

Inspect staged changes before committing:

```powershell
git diff --cached
```

## Pull Request Rules

Each PR should represent one unit of frontend work.

Screen PRs should say:

- which screen was added
- which files are intentionally page-specific
- whether it uses mock data
- whether it touches shared files
- how it was validated

If a screen PR modifies `App.tsx`, `main.tsx`, global routing, or shared layout,
the PR should be rejected unless the branch was explicitly assigned integration
ownership.

## Validation Rules

Before opening a PR, run:

```powershell
npm.cmd run build
```

If visual work is implemented, also inspect it in the browser before merging.

Do not open a PR with known TypeScript build errors.

After several parallel branches merge, create a final integration cleanup branch
from latest `develop` and run the full frontend build again.

## Conflict Handling

When two branches touch the same shared file, do not blindly resolve conflicts.

Instead:

1. Identify which branch owns the shared file.
2. Move unrelated changes out of the branch.
3. Rebase from latest `develop`.
4. Keep only the branch's assigned scope.

## Agent Checklist

Before coding:

- Confirm branch name and owner scope.
- Confirm forbidden shared files.
- Confirm expected files to add.

Before commit:

- Check `git status --short`.
- Stage explicit files only.
- Check `git diff --cached`.
- Verify the commit is atomic.

Before PR:

- Run `npm.cmd run build`.
- Confirm the branch does not include unrelated screens.
- Confirm no generated docs or screenshots are included unless requested.
