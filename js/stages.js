/*
 * Paddix stage definitions.
 *
 * Each stage is pure data, so adding or reordering stages needs no code changes.
 * Brick layout legend (one character per brick cell, up to 11 columns):
 *   ' ' empty      '1' 1-hit      '2' 2-hit      '3' 3-hit
 *   'U' unbreakable (never clears)  'P' 1-hit brick that always drops a power-up
 *
 * Difficulty ramps via ballSpeed (px/frame), paddleWidth and powerUpChance.
 */
window.PADDIX_STAGES = [
	{
		name: 'Sunrise Bay',
		tag: 'Warm up on the water',
		bg: ['#ffd07a', '#ff8a5c'],
		accent: '#ff5e7e',
		brick: { '1': '#ff8a5c', '2': '#ff6b6b', '3': '#e14b6a', 'U': '#8a8a8a', 'P': '#ffe66d' },
		ballSpeed: 4.2, paddleWidth: 130, powerUpChance: 0.18,
		rows: [
			'11111111111',
			'111P1111P11',
			'11111111111',
			'11111111111'
		]
	},
	{
		name: 'Neon City',
		tag: 'Bricks with a pulse',
		bg: ['#2b1055', '#7597de'],
		accent: '#00e5ff',
		brick: { '1': '#ff2e97', '2': '#00e5ff', '3': '#c400ff', 'U': '#5a5a7a', 'P': '#faff00' },
		ballSpeed: 4.6, paddleWidth: 125, powerUpChance: 0.16,
		rows: [
			'22222222222',
			'1  1  1  1 ',
			'11111111111',
			'2 2 2 2 2 2',
			'1111P111111'
		]
	},
	{
		name: 'Deep Sea',
		tag: 'Mind the pillars',
		bg: ['#0575e6', '#021b79'],
		accent: '#38f9d7',
		brick: { '1': '#43cea2', '2': '#3aa0ff', '3': '#185a9d', 'U': '#3b4a63', 'P': '#c2fffb' },
		ballSpeed: 4.9, paddleWidth: 120, powerUpChance: 0.15,
		rows: [
			'1U1U1U1U1U1',
			'11111111111',
			'2P2P2P2P2P2',
			'11111111111',
			'1U1U1U1U1U1'
		]
	},
	{
		name: 'Jungle Ruins',
		tag: 'Crack the emerald',
		bg: ['#134e5e', '#71b280'],
		accent: '#f9d423',
		brick: { '1': '#8bc34a', '2': '#43a047', '3': '#1b5e20', 'U': '#4e5d4b', 'P': '#f9d423' },
		ballSpeed: 5.2, paddleWidth: 115, powerUpChance: 0.15,
		rows: [
			'     1     ',
			'    222    ',
			'   22322   ',
			'  2232322  ',
			'   2P3P2   ',
			'    222    '
		]
	},
	{
		name: 'Volcano Core',
		tag: 'Things heat up',
		bg: ['#420000', '#c1440e'],
		accent: '#ffb347',
		brick: { '1': '#ff9800', '2': '#f4511e', '3': '#b71c1c', 'U': '#5c4033', 'P': '#ffe066' },
		ballSpeed: 5.5, paddleWidth: 110, powerUpChance: 0.14,
		rows: [
			'33333333333',
			'32111111123',
			'3P1U111U1P3',
			'32111111123',
			'33333333333'
		]
	},
	{
		name: 'Ice Cavern',
		tag: 'Cold and unforgiving',
		bg: ['#83a4d4', '#b6fbff'],
		accent: '#0077b6',
		brick: { '1': '#90e0ef', '2': '#48cae4', '3': '#0096c7', 'U': '#6b7a8f', 'P': '#caf0f8' },
		ballSpeed: 5.8, paddleWidth: 105, powerUpChance: 0.13,
		rows: [
			'UUUUUUUUUUU',
			'U111111111U',
			'U1221P1221U',
			'U111111111U',
			'U222222222U'
		]
	},
	{
		name: 'Space Station',
		tag: 'Zero-G checkerboard',
		bg: ['#0f0c29', '#302b63'],
		accent: '#a06bff',
		brick: { '1': '#7b8cff', '2': '#b06bff', '3': '#5e35b1', 'U': '#3a3a5a', 'P': '#ffd166' },
		ballSpeed: 6.1, paddleWidth: 100, powerUpChance: 0.13,
		rows: [
			'2 1 2 1 2 1',
			' 1 2 1 2 1 ',
			'2 1 P 1 2 1',
			' 3 1 3 1 3 ',
			'2 1 2 1 2 1'
		]
	},
	{
		name: 'Final Circuit',
		tag: 'No mercy',
		bg: ['#141e30', '#243b55'],
		accent: '#00ffa3',
		brick: { '1': '#00ffa3', '2': '#00b8ff', '3': '#6a00ff', 'U': '#2a3b4d', 'P': '#ffe066' },
		ballSpeed: 6.5, paddleWidth: 95, powerUpChance: 0.12,
		rows: [
			'3U3U3U3U3U3',
			'33333333333',
			'U3P3U3P3U3U',
			'33333333333',
			'3U3U3U3U3U3'
		]
	}
];
