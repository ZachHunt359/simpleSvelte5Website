## Contributing guidelines

This project follows a small, pragmatic set of rules to keep the codebase accessible and maintainable.

### Svelte a11y ignores (when they're acceptable)

Sometimes a linter (Svelte's a11y rules) will flag an element such as a backdrop overlay because it has a click handler but isn't a native interactive element. In this codebase we allow a targeted `svelte-ignore` comment in the following, audited cases only:

- Backdrop overlays for modals: if the overlay is implemented as a focusable container (has `role`, `aria-label`, `tabindex`) and includes guarded keyboard handling that only reacts when the event originates on the backdrop (e.g. checks `e.target === e.currentTarget`), then a targeted `<!-- svelte-ignore a11y_click_events_have_key_events -->` is acceptable.

Why: using a simple div for the backdrop keeps the markup and styling straightforward while still providing keyboard access and clear semantics. We prefer this pattern for small modal overlays where the interactive bits (close buttons, form controls) are accessible and focus is trapped inside the dialog.

When to avoid ignores:

- Don't add ignores for general interactive UI (buttons, links, custom widgets). Instead, refactor the markup to use real interactive elements (`<button>`, `<a>`, or role+keyboard handlers) so the accessibility rule is satisfied.
- Don't add broad `svelte-ignore` comments; scope them to the single line immediately before the offending element and include a brief dev-note comment explaining why it's safe.

If you're unsure whether an ignore is acceptable, open a PR and request an accessibility review.

Thanks for helping keep the site accessible!
