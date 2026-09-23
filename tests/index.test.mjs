import assert from "node:assert/strict";
import { test } from "node:test";
import {
	CHARACTER_SETS,
	CHARACTER_SET_NAMES,
	DEFAULT_CHARACTER_SETS,
	DEFAULT_LENGTH,
	calculateEntropy,
	generatePassword,
	generatePasswords,
	validatePassword,
} from "../src/index.ts";

test("curated alphabets and defaults are stable", () => {
	assert.deepEqual(CHARACTER_SETS, {
		lower: "abcdefghijkmnopqrstuvwxyz",
		upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
		number: "23456789",
		common: "!&*%",
		other: "-=_+#@;:,.?/",
	});
	assert.equal(DEFAULT_LENGTH, 24);
	assert.deepEqual(CHARACTER_SET_NAMES, ["lower", "upper", "number", "common", "other"]);
	assert.deepEqual(DEFAULT_CHARACTER_SETS, ["lower", "upper", "number"]);
	assert.equal(Object.isFrozen(CHARACTER_SETS), true);
	assert.equal(Object.isFrozen(DEFAULT_CHARACTER_SETS), true);
	const generated = generatePassword();
	assert.equal(generated.password.length, 24);
	assert.equal(new Set(generated.password).size, 24);
	assert.deepEqual(
		{ bits: generated.bits, strength: generated.strength },
		calculateEntropy(),
	);
});

test("all character-set combinations maximize variety and balance repetition", () => {
	for (let mask = 1; mask < 2 ** CHARACTER_SET_NAMES.length; mask++) {
		const selected = CHARACTER_SET_NAMES.filter((_, index) => (mask & (1 << index)) !== 0);
		const alphabet = selected.map((key) => CHARACTER_SETS[key]).join("");
		const lengths = new Set([5, alphabet.length, alphabet.length + 1, 128, 256]);
		for (const length of lengths) {
			if (length < 5 || length > 256) {
				continue;
			}
			const { password } = generatePassword({ length, characterSets: selected });
			assert.equal(password.length, length);
			const counts = new Map([...alphabet].map((character) => [character, 0]));
			for (const character of password) {
				assert.equal(counts.has(character), true);
				counts.set(character, counts.get(character) + 1);
			}
			assert.equal(Math.max(...counts.values()) - Math.min(...counts.values()) <= 1, true);
			assert.equal(new Set(password).size, Math.min(length, alphabet.length));
		}
	}
});

test("entropy counts the exact balanced output space", () => {
	const common = ["common"];
	assert.ok(
		Math.abs(calculateEntropy({ length: 5, characterSets: common }).bits - Math.log2(240)) <
			1e-12,
	);
	assert.ok(
		Math.abs(calculateEntropy({ length: 8, characterSets: common }).bits - Math.log2(2520)) <
			1e-12,
	);
	const withoutReplacement = Array.from({ length: 24 }, (_, index) => Math.log2(57 - index));
	assert.ok(
		Math.abs(
			calculateEntropy({ length: 24 }).bits -
				withoutReplacement.reduce((sum, bits) => sum + bits, 0),
		) < 1e-10,
	);
	assert.equal(calculateEntropy({ length: 5, characterSets: common }).strength, "veryWeak");
});

test("entropy remains exact below the generation minimum", () => {
	for (const length of [0, 1, 2, 3, 4]) {
		const expectedBits = Array.from({ length }, (_, index) => Math.log2(57 - index)).reduce(
			(sum, bits) => sum + bits,
			0,
		);
		const entropy = calculateEntropy({ length });
		assert.ok(Math.abs(entropy.bits - expectedBits) < 1e-12);
		assert.equal(entropy.strength, "veryWeak");
		assert.throws(() => generatePassword({ length }), /length between 5 and 256/);
	}
	assert.ok(Math.abs(calculateEntropy({ length: 1, characterSets: ["common"] }).bits - 2) < 1e-12);
	assert.throws(() => calculateEntropy({ length: 0, characterSets: [] }), /Select at least one/);
});

test("advisory strength categories cover each entropy range", () => {
	const cases = [
		["common", 5, "veryWeak"],
		["common", 24, "weak"],
		["lower", 15, "fair"],
		["lower", 24, "strong"],
		["lower", 32, "veryStrong"],
	];
	for (const [characterSet, length, strength] of cases) {
		assert.equal(
			calculateEntropy({ length, characterSets: [characterSet] }).strength,
			strength,
		);
	}
});

test("batch generation returns valid values with the same entropy", () => {
	const options = { length: 24, characterSets: ["lower", "upper", "number"] };
	const { passwords, bits, strength } = generatePasswords(100, options);
	assert.equal(passwords.length, 100);
	assert.deepEqual({ bits, strength }, calculateEntropy(options));
	assert.equal(
		passwords.every(
			(password) => password.length === 24 && new Set(password).size === 24,
		),
		true,
	);
});

test("manual password validation checks configurable length and category minima", () => {
	const policy = {
		minLength: 12,
		maxLength: 20,
		lowercase: 1,
		uppercase: 1,
		digits: 1,
		special: 1,
	};
	const accepted = validatePassword(`${"a".repeat(9)}A2🔐`, policy);
	assert.deepEqual({ valid: accepted.valid, length: accepted.length, counts: accepted.counts, issues: accepted.issues }, {
		valid: true,
		length: 12,
		counts: { lowercase: 9, uppercase: 1, digits: 1, special: 1 },
		issues: [],
	});
	assert.ok(Number.isFinite(accepted.estimatedBits));
	assert.equal(accepted.estimatedStrength, "fair");
	const tooShort = validatePassword("A2!", policy);
	assert.deepEqual({ valid: tooShort.valid, length: tooShort.length, counts: tooShort.counts, issues: tooShort.issues }, {
		valid: false,
		length: 3,
		counts: { lowercase: 0, uppercase: 1, digits: 1, special: 1 },
		issues: ["tooShort", "tooFewLowercase"],
	});
	assert.equal(tooShort.estimatedStrength, "veryWeak");
	const tooLong = validatePassword("a".repeat(21), policy);
	assert.deepEqual({ valid: tooLong.valid, length: tooLong.length, counts: tooLong.counts, issues: tooLong.issues }, {
		valid: false,
		length: 21,
		counts: { lowercase: 21, uppercase: 0, digits: 0, special: 0 },
		issues: ["tooLong", "tooFewUppercase", "tooFewDigits", "tooFewSpecial"],
	});
	assert.equal(tooLong.estimatedStrength, "veryWeak");
	assert.deepEqual(validatePassword("a".repeat(24)).issues, ["tooFewUppercase", "tooFewDigits"]);
	assert.equal(validatePassword(`${"a".repeat(22)}A2`).valid, true);
	assert.equal(validatePassword("a".repeat(23)).issues.includes("tooShort"), true);
	assert.deepEqual(validatePassword("é 🔐", { minLength: 3, maxLength: 10, special: 1 }).counts, {
		lowercase: 0,
		uppercase: 0,
		digits: 0,
		special: 1,
	});
	const { password } = generatePassword();
	assert.equal(validatePassword(password).valid, /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password));
	for (let index = 0; index < 100; index++) {
		const generated = generatePassword();
		assert.ok(Math.abs(validatePassword(generated.password).estimatedBits - generated.bits) < 1e-10);
	}
	assert.equal(validatePassword("").estimatedBits, 0);
	assert.equal(validatePassword("abcdefghijklmnopqrstuvwx").estimatedStrength, "veryWeak");
	assert.equal(validatePassword("abababababababababababab").estimatedStrength, "veryWeak");
	assert.equal(validatePassword("é".repeat(24)).estimatedStrength, "veryWeak");
});

test("manual estimates match generated entropy with an optional generator-set hint", () => {
	for (let mask = 1; mask < 2 ** CHARACTER_SET_NAMES.length; mask++) {
		const generatorCharacterSets = CHARACTER_SET_NAMES.filter(
			(_, index) => (mask & (1 << index)) !== 0,
		);
		const alphabetLength = generatorCharacterSets.reduce(
			(sum, key) => sum + CHARACTER_SETS[key].length,
			0,
		);
		for (const length of new Set([5, 24, alphabetLength, alphabetLength + 1, 128, 256])) {
			if (length < 5 || length > 256) {
				continue;
			}
			const generated = generatePassword({ length, characterSets: generatorCharacterSets });
			const validation = validatePassword(generated.password, {
				minLength: 1,
				generatorCharacterSets,
			});
			assert.ok(Math.abs(validation.estimatedBits - generated.bits) < 1e-10);
			assert.equal(validation.estimatedStrength, generated.strength);
		}
	}
	const unrestricted = validatePassword("🔐".repeat(24), {
		generatorCharacterSets: ["common"],
	});
	assert.deepEqual(unrestricted.issues, ["tooFewLowercase", "tooFewUppercase", "tooFewDigits"]);
	assert.equal(unrestricted.counts.special, 24);
	assert.equal(validatePassword("!&*%2", { minLength: 1, lowercase: 0, uppercase: 0, generatorCharacterSets: ["common"] }).valid, true);
});

test("one out-of-set substitution does not cause a large estimate jump", () => {
	const policy = { generatorCharacterSets: ["lower", "upper", "number", "common"] };
	const original = validatePassword("4iNjq2dwm7KYLv3&F!brcZHoy", policy);
	const edited = validatePassword("4iNjq2dwm7KYLv3&F+brcZHoy", policy);
	const twiceEdited = validatePassword("4iNjq2dwm7KYLv3+F?brcZHoy", policy);
	assert.equal(original.valid, true);
	assert.equal(edited.valid, true);
	assert.ok(Math.abs(original.estimatedBits - edited.estimatedBits) < 2);
	assert.ok(Math.abs(edited.estimatedBits - twiceEdited.estimatedBits) < 2);
	assert.equal(edited.counts.special, original.counts.special);
});

test("invalid manual password policies are rejected", () => {
	for (const policy of [
		{ minLength: 0 },
		{ minLength: 21, maxLength: 20 },
		{ maxLength: 257 },
		{ minLength: 12.5 },
	]) {
		assert.throws(() => validatePassword("abcde", policy), /policy lengths between 1 and 256/);
	}
	for (const policy of [
		{ lowercase: -1 },
		{ uppercase: 1.5 },
		{ minLength: 1, maxLength: 5, lowercase: 3, uppercase: 3 },
	]) {
		assert.throws(() => validatePassword("abcde", policy), /category minima/);
	}
	assert.throws(() => validatePassword(123), /password as text/);
	assert.throws(() => validatePassword("abcde", null), /policy as an object/);
	assert.throws(
		() => validatePassword("abcde", { generatorCharacterSets: ["unknown"] }),
		/Unknown character set/,
	);
	assert.throws(
		() => validatePassword("abcde", { generatorCharacterSets: ["common", "common"] }),
		/selected twice/,
	);
});

test("random indices reject values outside the unbiased range", () => {
	const originalCrypto = globalThis.crypto;
	let draws = 0;
	try {
		Object.defineProperty(globalThis, "crypto", {
			configurable: true,
			value: {
				getRandomValues(array) {
					array[0] = draws++ === 0 ? 0xffffffff : 0;
					return array;
				},
			},
		});
		const result = generatePassword();
		assert.equal(result.password.length, 24);
		assert.equal(draws, 80);
	} finally {
		Object.defineProperty(globalThis, "crypto", {
			configurable: true,
			value: originalCrypto,
		});
	}
});

test("invalid settings fail before generation", () => {
	assert.throws(() => calculateEntropy("abcde"), /options as an object/);
	assert.throws(() => generatePassword("abcde"), /options as an object/);
	for (const length of [-1, 257, 10.5, Number.NaN, Number.POSITIVE_INFINITY]) {
		assert.throws(() => generatePassword({ length }), /length between 5 and 256/);
		assert.throws(() => calculateEntropy({ length }), /length between 0 and 256/);
	}
	assert.throws(() => generatePassword({ characterSets: [] }), /Select at least one/);
	assert.throws(
		() => generatePassword({ characterSets: ["lower", "lower"] }),
		/selected twice/,
	);
	assert.throws(() => generatePassword({ characterSets: ["unknown"] }), /Unknown character set/);
	assert.throws(() => generatePassword({ characterSets: "lower" }), /Select at least one/);
	assert.throws(() => generatePassword({ characterSets: [3] }), /Unknown character set/);
	for (const count of [0, 101, 1.5, Number.NaN]) {
		assert.throws(() => generatePasswords(count), /1 to 100 passwords/);
	}
});
