# KnPassGnd

A small, browser-first TypeScript library for generating readable passwords with a cryptographically secure random source and calculable entropy.

## Install and build

```sh
pnpm install
pnpm test
pnpm build
```

The build writes ESM (`dist/index.js`), CommonJS (`dist/index.cjs`), a browser UMD bundle (`dist/index.umd.cjs`), and TypeScript declarations (`dist/index.d.ts`). `dist/` is generated and ignored by Git. The package includes the built files when packed or published.

Building with Vite 8 requires Node.js 20.19+ or 22.12+.

The generator needs `crypto.getRandomValues`. Use a secure context in browsers (HTTPS or localhost) or a Node.js runtime with global Web Crypto support. Randomness and password data remain local.

## API

```ts
import {
  calculateEntropy,
  CHARACTER_SET_NAMES,
  CHARACTER_SETS,
  generatePassword,
  generatePasswords,
  validatePassword,
} from "kn-pwd-gnd";
import type { PasswordOptions } from "kn-pwd-gnd";

const result = generatePassword();
// { password: "...", bits: 131.777..., strength: "veryStrong" }

const options = {
  length: 32,
  characterSets: ["lower", "upper", "number", "common"],
} satisfies PasswordOptions;

const one = generatePassword(options);
const batch = generatePasswords(10, options);
// { passwords: ["...", "...", ...], bits: ..., strength: "veryStrong" }
const entropy = calculateEntropy(options);
const policy = {
  minLength: 24,
  maxLength: 32,
  lowercase: 1,
  uppercase: 1,
  digits: 1,
  special: 0,
  generatorCharacterSets: options.characterSets,
} as const;
const validation = validatePassword("a".repeat(24), policy);
// { valid: false, length: 24, counts: { ... }, issues: ["tooFewUppercase", "tooFewDigits"], estimatedBits: ..., estimatedStrength: "veryWeak" }
const copied = validatePassword(one.password, policy);
// copied.estimatedBits === one.bits; copied.estimatedStrength === one.strength
console.log(one, batch, entropy, validation, copied, CHARACTER_SET_NAMES, CHARACTER_SETS);
```

`generatePassword(options?)` returns `{ password, bits, strength }`. `generatePasswords(count, options?)` returns `{ passwords, bits, strength }`: 1 to 100 independently generated strings share one entropy value because they use the same settings. Both generation methods require a length from 5 to 256.

`calculateEntropy(options?)` returns `{ bits, strength }` without generating a password. It accepts lengths from 0 to 256. For lengths 1 to 4, it calculates the exact entropy that the same selection algorithm would have if generation at that length were enabled; `generatePassword` and `generatePasswords` still reject those lengths. Only length 0 has zero bits, representing the single empty string. Negative, fractional, non-finite, and above-256 lengths throw. All three functions default to 24 characters and the `lower`, `upper`, and `number` sets.

The exported TypeScript types are `CharacterSet`, `PasswordStrength`, `PasswordOptions`, `PasswordEntropy`, `GeneratedPassword`, `GeneratedPasswords`, `PasswordPolicyOptions`, `PasswordCharacterCounts`, `PasswordPolicyIssue`, and `PasswordPolicyResult`. `CharacterSet` is a union of the supported names rather than a general `string`; TypeScript catches unsupported names before runtime. JavaScript callers receive the same validation at runtime. For a separately declared options object, `satisfies PasswordOptions` checks its shape while keeping the supported string literals inferred. An enum would add emitted JavaScript without improving this contract.

The available sets are:

| Name | Characters |
| --- | --- |
| `lower` | `abcdefghijkmnopqrstuvwxyz` |
| `upper` | `ABCDEFGHJKLMNPQRSTUVWXYZ` |
| `number` | `23456789` |
| `common` | `!&*%` |
| `other` | `-=_+#@;:,.?/` |

Select at least one set. Unknown or repeated set names and invalid lengths or batch sizes throw errors. The selection order does not affect the alphabet. `CHARACTER_SET_NAMES` lists the accepted names in canonical order; `CHARACTER_SETS` maps them to their characters. `DEFAULT_LENGTH` and `DEFAULT_CHARACTER_SETS` expose the defaults. These values are frozen at runtime.

For direct browser use after building:

```html
<script src="./dist/index.umd.cjs"></script>
<script>
  const result = KnPassGnd.generatePassword();
  console.log(result.password, result.bits);
</script>
```

The browser bundle is self-contained. Its `.cjs` filename identifies the generated bundle on disk; the script itself exposes `KnPassGnd` globally when loaded with a classic `<script>` tag.

## Manual password policy

`validatePassword(password, policy?)` checks a manually entered string without restricting it to the generator's curated alphabet. The policy accepts `minLength`, `maxLength`, `lowercase`, `uppercase`, `digits`, and `special`; the last four are minimum counts. The defaults are 24 and 256 for length, and zero for each category. Policy limits must satisfy `1 <= minLength <= maxLength <= 256`; counts must be nonnegative integers and their sum cannot exceed `maxLength`. Zero category minima avoid imposing arbitrary composition rules on a 24-character password. Set any minimum to 1 or more when your application requires that category. Optional `generatorCharacterSets` tells the estimator which generator sets to compare against; it defaults to `DEFAULT_CHARACTER_SETS` and **never restricts accepted password characters**. Pass the same selection used in `generatePassword({ characterSets })` to compare a copied generated password, including one with `common` or `other` symbols.

The method returns `{ valid, length, counts, issues, estimatedBits, estimatedStrength }`. Length counts Unicode code points. `lowercase` counts ASCII `a-z`, `uppercase` counts ASCII `A-Z`, `digits` counts ASCII `0-9`, and `special` counts Unicode punctuation and symbols, including emoji. Other characters, including spaces and accented letters, remain allowed but do not contribute to those four counts. Possible issues are `tooShort`, `tooLong`, `tooFewLowercase`, `tooFewUppercase`, `tooFewDigits`, and `tooFewSpecial`. The generator's default 24-character output meets the default policy; custom category minima may require checking and regenerating a generated password.

`valid` means only that the string meets these explicit rules. It does **not** mean the user chose it unpredictably. `estimatedBits` is a rough base-2 guess-work indicator, **not entropy**: it starts with the observed ASCII category sizes (26 lowercase, 26 uppercase, 10 digits, 33 punctuation/symbol candidates) and discounts whole-string repetitions and ascending sequences. Unclassified characters do not increase the estimate. When the text fits the exact output distribution for `generatorCharacterSets`, the estimate uses that distribution's bit count. Otherwise, the heuristic is capped by the generator-model count plus a small adjustment for each character substitution needed to reach that distribution; the adjustment uses `log2(95 / alphabet size)` per substitution. This avoids a large score jump when a character is changed to one outside the selected sets. Thus copying a generated password into validation with the same set selection yields the same bit number at any supported length, but matching text alone does not prove it was generated. `estimatedStrength` applies the same advisory bands below to that estimate. A dictionary word, keyboard pattern, personal information, or other predictable choice can still receive a grossly inflated score. Do not use the estimate as an acceptance or security guarantee; use a breached/common-password blocklist and server-side rate limiting for account creation. Use `generatePassword` when cryptographically exact generator entropy is required. [NIST's password guidance](https://pages.nist.gov/800-63-4/sp800-63b/passwords/) distinguishes calculable entropy from the difficult problem of estimating the strength of user-chosen passwords.

## Generation and entropy

The generator uses the selected curated characters exactly. It chooses distinct characters until all selected characters have appeared once. For longer passwords, it repeats characters as evenly as possible: each character occurs either `q` or `q + 1` times. It selects the extra characters uniformly, then shuffles with Fisher–Yates. Each index is drawn from `crypto.getRandomValues` with rejection sampling to avoid modulo bias.

The reported entropy is based on the exact number of passwords this process can produce uniformly. If the alphabet has `A` characters and the password has length `L`, define `q = floor(L / A)` and `r = L mod A`. The number of possible passwords is:

```text
C(A, r) × L! / ((q + 1)!^r × q!^(A - r))
```

The entropy is `log2` of this count. It measures the generator and its known settings, so it must not be used as a score for an arbitrary user-entered password.

`strength` is a convenient UI category, not an official security rating. Its identifiers use camelCase, like the rest of the JavaScript API:

| Entropy | `strength` |
| --- | --- |
| Below 40 bits | `veryWeak` |
| 40 to below 60 bits | `weak` |
| 60 to below 80 bits | `fair` |
| 80 to below 128 bits | `strong` |
| 128 bits and above | `veryStrong` |

The bit value is the meaningful measurement. Actual account security also depends on protections such as [login rate limiting and password storage](https://pages.nist.gov/800-63-4/sp800-63b.html). These categories are deliberately advisory and are not NIST thresholds for passwords.

## Migration from 1.x

Version 2 removes the global `KnPassGnd.generate(len, masks, colors)` and `KnPassGnd.entropy(password, colors)` API. Import `generatePassword({ length, characterSets })` and `calculateEntropy({ length, characterSets })` instead. The old `MASKS`, `STRENGTH`, `COLORS`, `VERSION`, bar width, and bar color properties are removed. Character set names replace positional mask arrays, and UI colors belong in the consuming application. The reported entropy now describes the generator's exact output distribution instead of inspecting the generated text. Strength identifiers use camelCase, for example `veryWeak` and `veryStrong`. Batch results contain a `passwords` array with `bits` and `strength` once at the root.

See [CHANGELOG.md](CHANGELOG.md) for release history and [LICENSE.txt](LICENSE.txt) for the MIT license.
