# Release notes: v1.4.0

> Use a version number and release date that match the published build. Keep this summary focused on user-visible changes.

**Release date:** 2026-08-15

## Summary

This release improves the documentation workflow with faster previews, clearer table controls, and safer HTML export defaults.

## Added

- Added a Markdown table template picker for API parameters, CLI commands, and feature comparisons.
- Added an option to continue generated Markdown in the full editor.
- Added clear copy success and failure feedback across Markdown tools.

## Changed

- Updated the HTML converter to use Safe HTML by default.
- Simplified the tools directory so common documentation tasks are easier to find.
- Improved keyboard focus styles and mobile action layouts.

## Fixed

- Fixed escaping for pipe characters inside Markdown table cells.
- Fixed copy actions that did not explain browser clipboard permission failures.
- Fixed narrow-screen layout issues in generated Markdown output.

## Upgrade notes

No migration is required for this release. Existing Markdown files continue to work as before.

## Known limitations

- Markdown tables are optimized for GitHub Flavored Markdown and may render differently in other Markdown dialects.
- Raw HTML mode is intended only for trusted Markdown input.

## Feedback

Found an issue or have an idea? Please open an issue with the version number, expected behavior, and a minimal example when possible.
