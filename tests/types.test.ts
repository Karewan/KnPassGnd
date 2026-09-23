import {
	CHARACTER_SET_NAMES,
	CHARACTER_SETS,
	DEFAULT_CHARACTER_SETS,
	calculateEntropy,
	generatePassword,
	generatePasswords,
	validatePassword,
} from "../src/index";
import type {
	CharacterSet,
	GeneratedPassword,
	GeneratedPasswords,
	PasswordEntropy,
	PasswordOptions,
	PasswordPolicyOptions,
	PasswordPolicyResult,
	PasswordStrength,
} from "../src/index";

const selected: readonly CharacterSet[] = DEFAULT_CHARACTER_SETS;
const options = {
	length: 24,
	characterSets: ["lower", "upper", "number"],
} satisfies PasswordOptions;
const one: GeneratedPassword = generatePassword(options);
const many: GeneratedPasswords = generatePasswords(2, options);
const passwords: string[] = many.passwords;
const entropy: PasswordEntropy = calculateEntropy(options);
const strength: PasswordStrength = entropy.strength;
const alphabet: string = CHARACTER_SETS[CHARACTER_SET_NAMES[0]];
const policy = {
	minLength: 12,
	maxLength: 20,
	lowercase: 1,
	uppercase: 1,
	digits: 1,
	special: 0,
	generatorCharacterSets: ["lower", "upper", "number", "common"],
} satisfies PasswordPolicyOptions;
const validation: PasswordPolicyResult = validatePassword("a".repeat(12), policy);
const estimatedBits: number = validation.estimatedBits;
const estimatedStrength: PasswordStrength = validation.estimatedStrength;

// @ts-expect-error Unknown names must fail at compile time.
const invalidName: CharacterSet = "digits";
// @ts-expect-error Length must be a number.
const invalidLength: PasswordOptions = { length: "24" };
// @ts-expect-error Selection must contain supported names.
const invalidSelection: PasswordOptions = { characterSets: ["digits"] };
// @ts-expect-error Manual policy has category minima instead of generator sets.
const invalidPolicy: PasswordPolicyOptions = { characterSets: ["lower"] };

void [
	selected,
	one,
	many,
	passwords,
	strength,
	validation,
	estimatedBits,
	estimatedStrength,
	alphabet,
	invalidName,
	invalidLength,
	invalidSelection,
	invalidPolicy,
];
