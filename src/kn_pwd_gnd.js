'use strict';
const KnPassGnd = function() {
	const VERSION = '1.0.4',
	MASKS = {
		entropy: {
			lower: /[a-z]/,
			upper: /[A-Z]/,
			number: /[0-9]/,
			csymb: /[!"£$€%^&*()]/,
			osymb: /[`¬\-=_+[\]{};'#:@~,./<>?\\|]/
		},
		generator: [
			// lower
			'abcdefghijkmnopqrstuvwxyz',
			// upper
			'ABCDEFGHJKLMNPQRSTUVWXYZ',
			// number
			'23456789',
			// csymb
			'!&*%',
			// osymb
			'-=_+#@;:,.?/'
		]
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
			masks[0] ? 25 : 0,
			masks[1] ? 25 : 0,
			masks[2] ? 20 : 0,
			masks[3] ? 20 : 0,
			masks[4] ? 10: 0
		], len);

		dist.forEach((v, k) => {
			if(!v) return;

			mask = masks[k];
			numOfUnique = mask.length;

			for(; dist[k] > 0; dist[k]--) {
				while(numOfUnique > 0 && mix.includes(char = mask[Math.floor(random() * mask.length)]));
				numOfUnique--;
				mix.push(char);
			}
		});

		const password = mix.sort(() => .5 - random()).join('');

		return {
			password,
			entropy: entropy(password, colors)
		}
	}

	return {
		VERSION,
		MASKS,
		STRENGTH,
		COLORS,
		entropy,
		generate
	};
}();
