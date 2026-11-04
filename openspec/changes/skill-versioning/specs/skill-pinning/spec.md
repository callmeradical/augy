# Spec Delta

## Purpose

Lets a user freeze a skill so `augy update` never changes it until they release it, and shows which skills are frozen.

## ADDED Requirements

### Requirement: Pin a skill
`augy pin <skill>` SHALL set the skill's pinned flag in the lockfile, after which `augy update` SHALL leave that skill untouched. Pinning an unknown skill SHALL be an error. Source: US-10; PD: "`augy pin <skill>` / `augy unpin <skill>` just flip the pinned flag. Unknown skills are an error."

#### Scenario: Pinned skill not updated
- **WHEN** the user runs `augy pin tdd`, `tdd` then changes upstream, and the user runs `augy update --all`
- **THEN** `tdd`'s files and recorded SHA are unchanged

#### Scenario: Pin unknown skill
- **WHEN** the user runs `augy pin nosuchskill`
- **THEN** the command fails with an error and the lockfile is unchanged

### Requirement: Unpin a skill
`augy unpin <skill>` SHALL clear the skill's pinned flag so the skill is eligible for `augy update` again. Unpinning an unknown skill SHALL be an error. Source: US-11; PD: "Unknown skills are an error."

#### Scenario: Unpinned skill gets upgrades
- **WHEN** `tdd` is pinned with an upstream change, and the user runs `augy unpin tdd` then `augy update`
- **THEN** `tdd` is offered as an upgrade

#### Scenario: Unpin unknown skill
- **WHEN** the user runs `augy unpin nosuchskill`
- **THEN** the command fails with an error

### Requirement: Pinned status visible
`augy list` and `augy info <skill>` SHALL show whether a skill is pinned. Source: US-15.

#### Scenario: Pinned shown in list and info
- **WHEN** `tdd` is pinned and the user runs `augy list` and `augy info tdd`
- **THEN** both outputs indicate that `tdd` is pinned

### Requirement: Pinned flag survives reinstall
Reinstalling a pinned skill SHALL keep its pinned flag set. Source: PD: "Pinning affects only `augy update`. Reinstalling a skill keeps its pinned flag."

#### Scenario: Reinstall pinned skill
- **WHEN** `tdd` is pinned and the user runs `augy install` for `tdd` again
- **THEN** `tdd` is still pinned in the lockfile
