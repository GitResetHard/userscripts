---
name: typescript-scriptcat-engineer
description: Design, develop, refactor, debug, test, document, and maintain ScriptCat userscripts written in TypeScript. Treats each userscript as an independent TypeScript project with modular architecture — never a single-file dump. Use when creating a new userscript, refactoring an existing one, converting JavaScript to TypeScript, debugging DOM or SPA issues, building MutationObserver systems, working with userscript APIs, managing configuration or storage, reviewing architecture, or improving TypeScript quality.
disable-model-invocation: true
---

# TypeScript ScriptCat Engineer

## Core philosophy

Build software, not scripts glued together in one giant file.

Every userscript is an independent TypeScript project with its own `package.json`, `tsconfig.json`, `vite.config.ts`, and `README.md`. Architecture scales with complexity — do not over-engineer, do not under-engineer.

## Project layout

```
scripts/
└── <script-name>/
    ├── src/
    │   ├── main.ts          ← entry point and orchestration only
    │   └── ...
    ├── README.md
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

`main.ts` is the orchestration layer. It initialises config, creates services, wires features, registers observers, and starts the application. It does NOT contain implementation logic.

For module structure by complexity, see [architecture.md](architecture.md).  
For code patterns (MutationObserver, SPA navigation, config, storage, etc.), see [patterns.md](patterns.md).

## Engineering workflow

Before implementing any non-trivial change:

1. Inspect the existing project structure and architecture
2. Understand what is already there and what modules exist
3. Identify the correct module or feature boundary for the change
4. Determine whether an existing utility can be reused
5. Implement the smallest maintainable solution
6. Leave unrelated code untouched
7. Verify the result compiles and behaves correctly

Never blindly rewrite the entire project.

## Architecture decisions

Create a new module when any of the following is true:

- The functionality has a distinct responsibility from everything else
- It is reused by more than one module
- It is complex enough to warrant isolation
- Isolating it makes `main.ts` meaningfully easier to understand
- It would be easier to test in isolation

Keep it local otherwise. Never create a file that is a single thin wrapper around one function.

For detailed decision guidance, see [architecture.md](architecture.md).

## TypeScript standards

`tsconfig.json` must have `"strict": true`.

**Avoid:**
- `any` — use `unknown`, proper types, or type narrowing
- Unsafe `as SomeType` assertions — use narrowing guards instead
- Giant functions or classes
- Global mutable state
- Duplicated logic
- Circular dependencies
- Premature abstractions used in only one place

**Prefer:**
- Type narrowing (`instanceof`, `typeof`, discriminated unions)
- Interfaces and type aliases where appropriate
- Pure functions
- Dependency injection when it eliminates coupling
- Composition over inheritance
- `const` by default; `let` only when reassignment is required
- `readonly` arrays and properties where mutation is not intended
- Explicit return types on all exported and public-facing functions
- Typed DOM queries: `querySelector<HTMLVideoElement>('video')`
- `unknown` when input type is genuinely unknown; narrow before use
- `async`/`await` over raw Promise chains
- Modern ES2022+ syntax

## Userscript standards

Follow ScriptCat best practices.

**Metadata:**
- Use correct `@name`, `@namespace`, `@version`, `@description`, `@author`
- Minimal `@grant` — only grant what the script actually uses
- Precise `@match` patterns — avoid overly broad wildcards
- Use `@exclude` when needed to narrow scope

**Behavior:**
- Use `MutationObserver` for DOM changes — no polling with `setInterval` unless there is no alternative
- Use event listeners over polling for user and browser events
- Clean up all observers and listeners when they are no longer needed
- Handle SPA navigation — observe `pushState`/`replaceState` or listen for `popstate` and `yt-navigate-finish` (or equivalent site-specific events)
- Use defensive DOM access — never assume an element exists; handle `null` gracefully
- Avoid unnecessary `document.querySelector` calls in tight loops — cache references
- Avoid global namespace pollution — keep everything within modules

## Documentation

Every project must have its own `README.md`. Update it whenever changes affect:

- Features or behaviour
- Installation or requirements
- Configuration options or defaults
- Permissions (`@grant`)
- Usage instructions
- Build commands or development workflow
- Architecture (for significant structural changes)

## Output behavior

**New project:** Create the complete project structure — config files, all source modules, `README.md`.

**New feature:** Provide complete code changes across all affected files, not isolated snippets.

**Refactoring:** State the architectural reason in one sentence, then implement it fully.

**Debugging:** Identify the root cause before changing any code. Explain what the bug is and why it occurs.

**Code review:** Identify bugs, architecture problems, TypeScript problems, performance problems, maintainability problems, security concerns, and userscript-specific issues. Do not flag stylistic differences that do not affect correctness or maintainability.

**General:** Favor pragmatic engineering decisions over dogmatic patterns. Generate complete, working implementations — not stubs or pseudo-code.

## Quality priorities

1. Correctness
2. Maintainability  
3. Type safety
4. Performance
5. Simplicity

Do not optimize prematurely. Do not introduce a dependency without a clear benefit. Do not create an abstraction that is used only once unless it meaningfully improves readability or separation of concerns.
