/** Selectable character set names in their canonical order. */
export const CHARACTER_SET_NAMES = Object.freeze([
	"lower",
	"upper",
	"number",
	"common",
	"other",
] as const);

/** A character set name accepted by password options. */
export type CharacterSet = (typeof CHARACTER_SET_NAMES)[number];

/** Curated alphabets whose characters favor visual distinction. */
export const CHARACTER_SETS = Object.freeze({
	lower: "abcdefghijkmnopqrstuvwxyz",
	upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
	number: "23456789",
	common: "!&*%",
	other: "-=_+#@;:,.?/",
} as const satisfies Record<CharacterSet, string>);

/** Advisory strength category for a randomly generated password. */
export type PasswordStrength =
	| "veryWeak"
	| "weak"
	| "fair"
	| "strong"
	| "veryStrong";

/** Settings shared by generation and entropy calculation. */
export interface PasswordOptions {
	/** Password length. Generation accepts 5 to 256; entropy calculation accepts 0 to 256. Defaults to 24. */
	length?: number;
	/** Unique set names. Defaults to lower, upper, and number. */
	characterSets?: readonly CharacterSet[];
}

/** Rules for a manually entered password. */
export interface PasswordPolicyOptions {
	/** Minimum accepted length, from 1 to 256. Defaults to 24. */
	minLength?: number;
	/** Maximum accepted length, from minLength to 256. Defaults to 256. */
	maxLength?: number;
	/** Minimum number of ASCII a-z characters. Defaults to 1. */
	lowercase?: number;
	/** Minimum number of ASCII A-Z characters. Defaults to 1. */
	uppercase?: number;
	/** Minimum number of ASCII 0-9 characters. Defaults to 1. */
	digits?: number;
	/** Minimum number of Unicode punctuation or symbol characters. Defaults to 0. */
	special?: number;
	/** Generator sets used only to calibrate the estimate; they never restrict accepted characters. */
	generatorCharacterSets?: readonly CharacterSet[];
}

/** Machine-readable policy failure codes. */
export type PasswordPolicyIssue =
	| "tooShort"
	| "tooLong"
	| "tooFewLowercase"
	| "tooFewUppercase"
	| "tooFewDigits"
	| "tooFewSpecial";

/** Counts for the four configurable character categories. */
export interface PasswordCharacterCounts {
	lowercase: number;
	uppercase: number;
	digits: number;
	special: number;
}

/** Policy compliance, without a claim about how hard the password is to guess. */
export interface PasswordPolicyResult {
	valid: boolean;
	length: number;
	counts: PasswordCharacterCounts;
	issues: PasswordPolicyIssue[];
	/** Heuristic log2 guess estimate, not cryptographic entropy. */
	estimatedBits: number;
	/** Advisory category derived from estimatedBits. */
	estimatedStrength: PasswordStrength;
}

/** Entropy under this generator's selection model and an advisory category. */
export interface PasswordEntropy {
	/** Base-2 logarithm of the number of equally likely outputs. */
	bits: number;
	/** UI-oriented category; the security of a real account also depends on verification. */
	strength: PasswordStrength;
}

/** A generated password with its configuration-based entropy. */
export interface GeneratedPassword extends PasswordEntropy {
	/** The generated text. */
	password: string;
}

/** A batch of passwords with entropy shared by every password in the batch. */
export interface GeneratedPasswords extends PasswordEntropy {
	/** Independently generated passwords using the same settings. */
	passwords: string[];
}

/** Default generated password length. */
export const DEFAULT_LENGTH = 24;
/** Default selected sets, frozen at runtime. */
export const DEFAULT_CHARACTER_SETS: readonly CharacterSet[] = Object.freeze([
	"lower",
	"upper",
	"number",
]);

const MIN_LENGTH = 5;
const MAX_LENGTH = 256;
const MAX_BATCH_SIZE = 100;
const UINT32_RANGE = 2 ** 32;
const strengthThresholds: readonly [PasswordStrength, number][] = [
	["veryWeak", 0],
	["weak", 40],
	["fair", 60],
	["strong", 80],
	["veryStrong", 128],
];

function isCharacterSet(value: unknown): value is CharacterSet {
	return typeof value === "string" && Object.hasOwn(CHARACTER_SETS, value);
}

function resolveAlphabet(characterSets?: readonly CharacterSet[]): string {
	const selected = characterSets ?? DEFAULT_CHARACTER_SETS;
	if (!Array.isArray(selected) || selected.length === 0) {
		throw new TypeError("Select at least one character set.");
	}
	const unique = new Set<CharacterSet>();
	for (const key of selected) {
		if (!isCharacterSet(key)) {
			throw new TypeError(`Unknown character set: ${String(key)}.`);
		}
		if (unique.has(key)) {
			throw new TypeError(`Character set selected twice: ${key}.`);
		}
		unique.add(key);
	}
	return CHARACTER_SET_NAMES.filter((key) => unique.has(key))
		.map((key) => CHARACTER_SETS[key])
		.join("");
}

function resolveOptions(
	options: PasswordOptions,
	minimumLength = MIN_LENGTH,
): { length: number; alphabet: string } {
	if (typeof options !== "object" || options === null || Array.isArray(options)) {
		throw new TypeError("Enter password options as an object.");
	}
	const length = options.length ?? DEFAULT_LENGTH;
	if (!Number.isInteger(length) || length < minimumLength || length > MAX_LENGTH) {
		throw new RangeError(`Choose a length between ${minimumLength} and ${MAX_LENGTH}.`);
	}
	const alphabet = resolveAlphabet(options.characterSets);
	return { length, alphabet };
}

function log2Factorial(value: number): number {
	let result = 0;
	for (let factor = 2; factor <= value; factor++) {
		result += Math.log2(factor);
	}
	return result;
}

function strengthFor(bits: number): PasswordStrength {
	let strength: PasswordStrength = "veryWeak";
	for (const [name, threshold] of strengthThresholds) {
		if (bits >= threshold) {
			strength = name;
		}
	}
	return strength;
}

function estimateGuessBits(
	characters: string[],
	counts: PasswordCharacterCounts,
	generatorAlphabet: string,
): number {
	if (characters.length === 0) {
		return 0;
	}
	const frequency = new Map([...generatorAlphabet].map((character) => [character, 0]));
	for (const character of characters) {
		const previous = frequency.get(character);
		if (previous !== undefined) {
			frequency.set(character, previous + 1);
		}
	}
	const repetitions = Math.floor(characters.length / frequency.size);
	const extras = characters.length % frequency.size;
	const frequencies = [...frequency.values()];
	const baseMatches = frequencies.reduce((sum, value) => sum + Math.min(value, repetitions), 0);
	const extraMatches = Math.min(
		extras,
		frequencies.filter((value) => value > repetitions).length,
	);
	const substitutions = characters.length - baseMatches - extraMatches;
	const generatorBits = entropyFor(characters.length, frequency.size).bits;
	if (substitutions === 0) {
		// A compatible string gets the generator-model value, without proving how it was chosen.
		return generatorBits;
	}
	const counted = counts.lowercase + counts.uppercase + counts.digits + counts.special;
	const poolSize =
		(counts.lowercase > 0 ? 26 : 0) +
		(counts.uppercase > 0 ? 26 : 0) +
		(counts.digits > 0 ? 10 : 0) +
		(counts.special > 0 ? 33 : 0);
	let bits = counted * Math.log2(Math.max(poolSize, 1));
	const folded = characters.join("").toLowerCase();
	for (let period = 1; period <= Math.floor(characters.length / 2); period++) {
		if (characters.length % period !== 0) {
			continue;
		}
		if (characters.every((character, index) => character === characters[index % period])) {
			bits = Math.min(bits, period * Math.log2(Math.max(poolSize, 1)) + Math.log2(characters.length));
			break;
		}
	}
	const codePoints = [...folded].map((character) => character.codePointAt(0) ?? 0);
	if (
		codePoints.length >= 3 &&
		codePoints.every((value, index) => index === 0 || value - (codePoints[index - 1] ?? 0) === 1)
	) {
		bits = Math.min(bits, Math.log2(95 * 2 * characters.length));
	}
	// Each departure relaxes the generator model gradually rather than switching to a larger pool at once.
	const adjustedGeneratorBits =
		generatorBits + substitutions * Math.log2(95 / frequency.size);
	return Math.max(0, Math.min(bits, adjustedGeneratorBits));
}

function entropyFor(length: number, alphabetSize: number): PasswordEntropy {
	const repetitions = Math.floor(length / alphabetSize);
	const extras = length % alphabetSize;
	// Choose which characters receive one extra copy, then arrange the resulting multiset.
	const bits =
		log2Factorial(alphabetSize) -
		log2Factorial(extras) -
		log2Factorial(alphabetSize - extras) +
		log2Factorial(length) -
		extras * log2Factorial(repetitions + 1) -
		(alphabetSize - extras) * log2Factorial(repetitions);
	return { bits, strength: strengthFor(bits) };
}

function randomInteger(maximum: number): number {
	const limit = Math.floor(UINT32_RANGE / maximum) * maximum;
	let value: number;
	do {
		value = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
	} while (value >= limit);
	return value % maximum;
}

function shuffle<T>(values: T[]): void {
	for (let index = values.length - 1; index > 0; index--) {
		const other = randomInteger(index + 1);
		const value = values[index] as T;
		values[index] = values[other] as T;
		values[other] = value;
	}
}

function generate(length: number, alphabet: string): string {
	const characters = [...alphabet];
	const repetitions = Math.floor(length / characters.length);
	const extras = length % characters.length;
	const result = characters.flatMap((character) =>
		Array.from({ length: repetitions }, () => character),
	);
	shuffle(characters);
	result.push(...characters.slice(0, extras));
	shuffle(result);
	return result.join("");
}

/** Calculate exact model entropy from known generation settings. */
export function calculateEntropy(options: PasswordOptions = {}): PasswordEntropy {
	const { length, alphabet } = resolveOptions(options, 0);
	return entropyFor(length, alphabet.length);
}

/** Check length and minimum character-category counts for a manually entered password. */
export function validatePassword(
	password: string,
	policy: PasswordPolicyOptions = {},
): PasswordPolicyResult {
	if (typeof password !== "string") {
		throw new TypeError("Enter a password as text.");
	}
	if (typeof policy !== "object" || policy === null || Array.isArray(policy)) {
		throw new TypeError("Enter password policy as an object.");
	}
	const minLength = policy.minLength ?? DEFAULT_LENGTH;
	const maxLength = policy.maxLength ?? MAX_LENGTH;
	if (
		!Number.isInteger(minLength) ||
		!Number.isInteger(maxLength) ||
		minLength < 1 ||
		maxLength > MAX_LENGTH ||
		maxLength < minLength
	) {
		throw new RangeError(`Choose policy lengths between 1 and ${MAX_LENGTH}.`);
	}
	const required: PasswordCharacterCounts = {
		lowercase: policy.lowercase ?? 1,
		uppercase: policy.uppercase ?? 1,
		digits: policy.digits ?? 1,
		special: policy.special ?? 0,
	};
	if (
		Object.values(required).some((minimum) => !Number.isInteger(minimum) || minimum < 0) ||
		Object.values(required).reduce((sum, minimum) => sum + minimum, 0) > maxLength
	) {
		throw new RangeError("Choose non-negative category minima that fit within maxLength.");
	}
	const generatorAlphabet = resolveAlphabet(policy.generatorCharacterSets);
	const characters = [...password];
	const counts: PasswordCharacterCounts = {
		lowercase: 0,
		uppercase: 0,
		digits: 0,
		special: 0,
	};
	for (const character of characters) {
		if (/[a-z]/.test(character)) {
			counts.lowercase++;
		} else if (/[A-Z]/.test(character)) {
			counts.uppercase++;
		} else if (/[0-9]/.test(character)) {
			counts.digits++;
		} else if (/[\p{P}\p{S}]/u.test(character)) {
			counts.special++;
		}
	}
	const issues: PasswordPolicyIssue[] = [];
	if (characters.length < minLength) {
		issues.push("tooShort");
	}
	if (characters.length > maxLength) {
		issues.push("tooLong");
	}
	if (counts.lowercase < required.lowercase) {
		issues.push("tooFewLowercase");
	}
	if (counts.uppercase < required.uppercase) {
		issues.push("tooFewUppercase");
	}
	if (counts.digits < required.digits) {
		issues.push("tooFewDigits");
	}
	if (counts.special < required.special) {
		issues.push("tooFewSpecial");
	}
	const estimatedBits = estimateGuessBits(characters, counts, generatorAlphabet);
	return {
		valid: issues.length === 0,
		length: characters.length,
		counts,
		issues,
		estimatedBits,
		estimatedStrength: strengthFor(estimatedBits),
	};
}

/** Generate one password with exact entropy for its settings. */
export function generatePassword(options: PasswordOptions = {}): GeneratedPassword {
	const { length, alphabet } = resolveOptions(options);
	return {
		password: generate(length, alphabet),
		...entropyFor(length, alphabet.length),
	};
}

/** Generate 1 to 100 independent passwords with shared entropy. */
export function generatePasswords(
	count: number,
	options: PasswordOptions = {},
): GeneratedPasswords {
	if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH_SIZE) {
		throw new RangeError(`Choose 1 to ${MAX_BATCH_SIZE} passwords.`);
	}
	const { length, alphabet } = resolveOptions(options);
	const entropy = entropyFor(length, alphabet.length);
	return {
		passwords: Array.from({ length: count }, () => generate(length, alphabet)),
		...entropy,
	};
}
