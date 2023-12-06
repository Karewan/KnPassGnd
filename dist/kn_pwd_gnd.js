/**
 * KnPassGnd v1.0.1 (2023-12-06 16:52:49 +0100)
 * Copyright (c) 2023 Florent VIALATTE
 * Released under the MIT license
 */
'use strict';
const KnPassGnd = function() {
	const MASKS = {
		entropy: {
			lower: /[a-z]/,
			upper: /[A-Z]/,
			number: /[0-9]/,
			csymb: /[!"£$€%^&*()]/,
			osymb: /[`¬\-=_+[\]{};'#:@~,./<>?\\|]/
		},
		generator: {
			lower: 'abcdefghijkmnopqrstuvwxyz',
			upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
			number: '23456789',
			csymb: '!&*%',
			osymb: '-=_+#@;:,.?/'
		}
	},
	STRENGTH = [
		{
			id: 'unacceptable',
			strength: 0
		},
		{
			id: 'very_weak',
			strength: 1
		},
		{
			id: 'weak',
			strength: 60
		},
		{
			id: 'fair',
			strength: 80
		},
		{
			id: 'strong',
			strength: 112
		},
		{
			id: 'very_strong',
			strength: 128
		}
	],
	COLORS = [
		[244, 67, 54],
		[255, 193, 7],
		[139, 195, 74]
	];

	function colorStrength(fadeFraction, colors) {
		let rgbColor1, rgbColor2,
		fade = fadeFraction / 100 * 2;

		if (fade >= 1) {
			fade -= 1;
			rgbColor1 = colors[1];
			rgbColor2 = colors[2];
		} else {
			rgbColor1 = colors[0];
			rgbColor2 = colors[1];
		}

		const red = Math.floor(rgbColor1[0] + (rgbColor2[0] - rgbColor1[0]) * fade),
		green = Math.floor(rgbColor1[1] + (rgbColor2[1] - rgbColor1[1]) * fade),
		blue = Math.floor(rgbColor1[2] + (rgbColor2[2] - rgbColor1[2]) * fade);

		return `rgb(${red},${green},${blue})`;
	}

	function random() {
		return crypto.getRandomValues(new Uint32Array(1))[0]/2**32;
	}

	function largestRemainder(numArr, totalSeats) {
		let sum = numArr.reduce((s, i) => s + i, 0);
		if(sum === 0) return numArr;

		let seatDistribution = numArr.map((num, index) => {
			let seats = (num / sum) * totalSeats;

			return {
				seats: Math.floor(seats),
				remainder: (seats - Math.floor(seats)).toFixed(4),
				index: index
			};
		})
		.sort((a, b) => {
			return b.remainder - a.remainder;
		});

		let takenSeats = seatDistribution.reduce((sum, current) => (sum + current.seats), 0);
		let totalRemains = totalSeats - takenSeats;
		for(let i = 0; i < totalRemains; i++) seatDistribution[i].seats++;

		return seatDistribution.sort((a, b) => (a.index - b.index)).map(a => a.seats);
	}

	function randomCharFromMask(mask) {
		return mask[Math.floor(random() * mask.length)];
	}

	function entropy(str, colors = COLORS) {
		let len = str.length,
		chars = 0,
		entropy = 0,
		includes = {
			lower: false,
			upper: false,
			number: false,
			csymb: false,
			osymb: false
		};

		if(len > 0) {
			if(includes.lower = MASKS.entropy.lower.test(str)) chars += 26;
			if(includes.upper = MASKS.entropy.upper.test(str)) chars += 26;
			if(includes.number = MASKS.entropy.number.test(str)) chars += 10;
			if(includes.csymb = MASKS.entropy.csymb.test(str)) chars += 10;
			if(includes.osymb = MASKS.entropy.osymb.test(str)) chars += 23;
		}

		entropy = chars > 0 ? parseInt(Math.log2(Math.pow(chars, len)), 10) : 0;

		let strength = STRENGTH[0].id;
		for(const s in STRENGTH) {
			if(entropy < STRENGTH[s].strength) continue;
			strength = STRENGTH[s].id;
		}

		const barWidth = (100 - (99 / (1 + Math.pow(entropy / 90, 10)))),
		barColor = colorStrength(barWidth, colors);

		return {
			entropy,
			includes,
			strength,
			barWidth,
			barColor,
			len,
		};
	}

	function generate(len = 18, masks = MASKS.generator, colors = COLORS) {
		if(len < 5) len = 5;

		let char,
		mask,
		numOfUnique,
		mix = [],
		dist = largestRemainder([
			MASKS.generator.lower ? 25 : 0,
			MASKS.generator.upper ? 25 : 0,
			MASKS.generator.number ? 20 : 0,
			MASKS.generator.csymb ? 20 : 0,
			MASKS.generator.osymb ? 10: 0
		], len);

		if(dist[0] > 0) {
			mask = MASKS.generator.lower;
			numOfUnique = mask.length;

			for(; dist[0] > 0; dist[0]--) {
				char = randomCharFromMask(mask);
				while(numOfUnique > 0 && mix.includes(char)) char = randomCharFromMask(mask);
				numOfUnique--;
				mix.push(char);
			}
		}

		if(dist[1] > 0) {
			mask = MASKS.generator.upper;
			numOfUnique = mask.length;

			for(; dist[1] > 0; dist[1]--) {
				char = randomCharFromMask(mask);
				while(numOfUnique > 0 && mix.includes(char)) char = randomCharFromMask(mask);
				numOfUnique--;
				mix.push(char);
			}
		}

		if(dist[2] > 0) {
			mask = MASKS.generator.number;
			numOfUnique = mask.length;

			for(; dist[2] > 0; dist[2]--) {
				char = randomCharFromMask(mask);
				while(numOfUnique > 0 && mix.includes(char)) char = randomCharFromMask(mask);
				numOfUnique--;
				mix.push(char);
			}
		}

		if(dist[3] > 0) {
			mask = MASKS.generator.csymb;
			numOfUnique = mask.length;

			for(; dist[3] > 0; dist[3]--) {
				char = randomCharFromMask(mask);
				while(numOfUnique > 0 && mix.includes(char)) char = randomCharFromMask(mask);
				numOfUnique--;
				mix.push(char);
			}
		}

		if(dist[4] > 0) {
			mask = MASKS.generator.osymb;
			numOfUnique = mask.length;

			for(; dist[4] > 0; dist[4]--) {
				char = randomCharFromMask(mask);
				while(numOfUnique > 0 && mix.includes(char)) char = randomCharFromMask(mask);
				numOfUnique--;
				mix.push(char);
			}
		}

		const password = mix.sort((a, b) => .5 - random()).join('');

		return {
			password,
			entropy: entropy(password, colors)
		}
	}

	return {
		MASKS,
		STRENGTH,
		COLORS,
		entropy,
		generate
	};
}();
