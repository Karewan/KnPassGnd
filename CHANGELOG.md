KnPassGnd Changelog
==========

v2.0.0 (2026-09-23):
----------------------------
* Rewrite the library in strict TypeScript with Vite-built ESM, CommonJS, and browser bundles plus declarations.
* Keep the curated character sets while replacing biased sorting with secure, unbiased Fisher–Yates shuffling.
* Maximize distinct characters and balance repetitions for passwords longer than the selected alphabet.
* Calculate the exact entropy of the generation process from its length and selected character sets.
* Replace the legacy positional and color-based API with named options, batch generation, and explicit entropy results.
* Provide typed character set names and advisory strength categories with camelCase identifiers.
* Calculate entropy for lengths below the generation minimum and share entropy at the root of batch results.
* Add unrestricted manual-password validation with a 24-character default minimum and configurable category counts, without assigning unsupported entropy claims.
* Add advisory strength and guess-work estimates to manual-password validation, separate from exact generator entropy.
* Match manual estimates to generated entropy for compatible passwords using optional generator character-set hints, without restricting manual input.
* Smooth manual strength estimates for characters outside the hinted generator sets instead of switching abruptly to an unrelated search-space model.
* Default to 24 characters and ignore generated distribution files in Git.

v1.0.4 (2024-10-21):
----------------------------
* Fix generate arg masks usage

v1.0.3 (2023-12-30):
----------------------------
* Reduced code size (-19%)

v1.0.2 (2023-12-16):
----------------------------
* Added constant VERSION

v1.0.1 (2023-12-06):
----------------------------
* Update default colors
* Ability to set color on generate function

v1.0.0 (2023-10-16):
----------------------------
* Initial release
