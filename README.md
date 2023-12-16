# KnPassGnd

Javascript random password generator and entropy calculator.

### Changelog

See the changelog [here](CHANGELOG.md)

### Usage

* Get the latest version in [dist](dist) folder

* Methods

	```javascript
	// Generate a random password
	let pwd = KnPassGnd.generate(
		len = 18,
		masks = MASKS.generator,
		colors = COLORS
	);
	/*
	{
		"password": "M&Cp7b*!:%3#9KTc5t",
		"entropy": {...}
	*/

	// Calc entropy
	let entropy = KnPassGnd.entropy(str, colors = COLORS);
	/*
		{
			"entropy": 118,
			"includes": {
				"lower": true,
				"upper": true,
				"number": true,
				"csymb": true,
				"osymb": true
			},
			"strength": "strong",
			"barWidth": 93.81655547883483,
			"barColor": "rgb(153,194,65)",
			"len": 18
		}
	*/
	```

* Properties

	```javascript
	// Return the default masks
	KnPassGnd.MASKS

	// Return the default strengths
	KnPassGnd.STRENGTH

	// Return the default colors
	KnPassGnd.COLORS;

	// Return the lib version
	KnPassGnd.VERSION;
	```

### License

See the license [here](LICENSE.txt)

```
The MIT License (MIT)

Copyright (c) 2023 Florent VIALATTE

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
