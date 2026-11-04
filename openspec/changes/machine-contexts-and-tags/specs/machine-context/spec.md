# Spec Delta

## Purpose

Lets each machine carry one local context (for example `work` or `personal`). That context, or a one-off `--context` flag, decides which skills `augy home pull` pre-selects.

## ADDED Requirements

### Requirement: Set the machine context
`augy context set <ctx>` SHALL store `<ctx>` as this machine's single context in augy's local lockfile (`~/.augy/registry.json`, or under `AUGY_HOME`), replacing any previous value. Any string SHALL be accepted as typed, case-sensitively, including custom names. Source: US-1, US-2, US-3, PD: "Machine context is single-valued and local."

#### Scenario: Mark a work laptop
- **WHEN** the user runs `augy context set work`
- **THEN** the lockfile records the machine context `work`

#### Scenario: Custom context name
- **WHEN** the user runs `augy context set client-acme`
- **THEN** the lockfile records the machine context `client-acme`

#### Scenario: Single value replaced
- **WHEN** the machine context is `work` and the user runs `augy context set personal`
- **THEN** the machine context is `personal` and `work` is no longer recorded

#### Scenario: Case preserved
- **WHEN** the user runs `augy context set Work`
- **THEN** the machine context is recorded as `Work`, distinct from `work`

### Requirement: Confirm the context and its effect
`augy context set` SHALL confirm the new context and explain that it determines which skills `augy home pull` pre-selects. Source: US-4.

#### Scenario: Confirmation message
- **WHEN** the user runs `augy context set work`
- **THEN** the output names `work` and states its effect on `augy home pull` pre-selection

### Requirement: Show the machine context
`augy context show` SHALL display the current machine context. When none is set, it SHALL say so and tell the user how to set one. Source: US-5.

#### Scenario: Context set
- **WHEN** the machine context is `work` and the user runs `augy context show`
- **THEN** the output shows `work`

#### Scenario: No context
- **WHEN** no machine context is set and the user runs `augy context show`
- **THEN** the output says no context is set and points to `augy context set`

### Requirement: Clear the machine context
`augy context clear` SHALL remove the machine context, so that `augy home pull` again pre-selects every skill when no `--context` is given. The machine context SHALL have no default. Source: US-6, PD: "has no default."

#### Scenario: Clear then pull
- **WHEN** the machine context is `work`, the user runs `augy context clear`, and then runs `augy home pull`
- **THEN** the lockfile has no machine context and every offered skill is pre-selected

#### Scenario: Fresh machine
- **WHEN** augy has never had a context set on this machine
- **THEN** `augy context show` reports that no context is set

### Requirement: Machine context stays on the machine
The machine context SHALL never be included in anything augy pushes to the home repo, and SHALL never be changed by `augy home pull`. Source: US-7, PD: "is never included in anything pushed to the home repo."

#### Scenario: Not pushed
- **WHEN** the machine context is `work` and the user runs `augy home push`
- **THEN** the home repo's manifest and files contain no machine context

#### Scenario: Not overwritten by pull
- **WHEN** the machine context is `personal`, another machine with context `work` has pushed, and the user runs `augy home pull`
- **THEN** this machine's context is still `personal`

### Requirement: Machine context drives pull pre-selection
When no `--context` is given, `augy home pull` SHALL pre-select skills that match the machine context under the tag matching rule: skills tagged with that context, skills tagged `universal`, and untagged skills. Source: US-2, US-22, PD: "Precedence on pull."

#### Scenario: Work laptop pre-selection
- **WHEN** the machine context is `work`, and the home repo has `a` tagged `work`, `b` tagged `personal`, `c` tagged `universal`, and untagged `d`, and the user runs `augy home pull`
- **THEN** `a`, `c`, and `d` are pre-selected and `b` is not

### Requirement: One-off context override on pull
`augy home pull --context <ctx>` SHALL use `<ctx>` for pre-selection in place of the machine context, for that run only. Precedence SHALL be `--context`, then the machine context, then no filter. Source: US-26, PD: "Precedence on pull."

#### Scenario: Override for one run
- **WHEN** the machine context is `work` and the user runs `augy home pull --context personal`
- **THEN** pre-selection follows `personal`, and afterwards the machine context is still `work`

#### Scenario: Override without a machine context
- **WHEN** no machine context is set and the user runs `augy home pull --context work`
- **THEN** pre-selection follows `work`

### Requirement: Pull shows the active context and tags
The `augy home pull` picker SHALL show the context in effect in its header and each skill's tags in its entry. Source: US-27.

#### Scenario: Header and hints
- **WHEN** the context in effect is `work` and the picker lists `tdd` tagged `universal`
- **THEN** the header shows `work` and the `tdd` entry shows `universal`

### Requirement: Context sets defaults only
The context in effect SHALL only change which skills are pre-selected. It SHALL never hide a skill or stop the user from selecting any skill on `augy home pull`. Source: US-28, PD: "Context affects pre-selection only."

#### Scenario: Pick an off-context skill
- **WHEN** the context is `personal` and skill `a` tagged `work` is not pre-selected
- **THEN** `a` is still listed and the user can select and install it

### Requirement: Other commands ignore the context
`augy install`, `augy sync`, `augy update`, `augy list`, `augy use`, and `augy bundle` SHALL behave the same whether or not a machine context is set. Source: PD: "It doesn't affect any other command."

#### Scenario: Sync not filtered
- **WHEN** the machine context is `personal` and the user runs `augy sync` on a manifest that includes a skill tagged `work`
- **THEN** the `work` skill is handled exactly as it would be with no machine context

#### Scenario: Off-context skills untouched
- **WHEN** the machine context is `personal` and a skill tagged `work` is already installed
- **THEN** no augy command removes or deactivates it because of the context
