/*
 * Paddix — a canvas brick-breaker, built on the Retroix engine.
 *
 * The shared plumbing (canvas, game loop, input, leaderboard, overlay screens,
 * retro initials entry, gfx helpers) comes from Retroix; this file is just the
 * brick-breaker: 8 themed stages, power-ups, combos and lives.
 */
(function () {
	'use strict';

	var LOGICAL = { w: 800, h: 600 };
	var STAGES = window.PADDIX_STAGES;
	var GRID = { cols: 11, left: 30, top: 74, gap: 6 };
	var BRICK_W = (LOGICAL.w - 2 * GRID.left - (GRID.cols - 1) * GRID.gap) / GRID.cols;
	var BRICK_H = 26;
	var PADDLE_Y = LOGICAL.h - 42;
	var PADDLE_H = 15;
	var BALL_R = 8;

	var clamp = Retroix.util.clamp, rand = Retroix.util.rand, hypot = Retroix.util.hypot;

	var view, ctx, board, screens, initEntry, fx, sfx;   // Retroix-provided
	var el = {};

	// --- game state ---
	var state = 'title';
	var stageIndex = 0, score = 0, lives = 3, combo = 0, wonFlag = false;
	var stage, paddle, balls, bricks, powerups, particles;
	var timers = { wide: 0, slow: 0 };
	var input = { mouseX: null, left: false, right: false };
	var introTimer = 0;

	var POWER = {
		wide:  { label: 'W', color: '#4cd964', name: 'Wide paddle' },
		multi: { label: 'M', color: '#00e5ff', name: 'Multiball' },
		slow:  { label: 'S', color: '#5aa9ff', name: 'Slow-mo' },
		life:  { label: '+', color: '#ff5e7e', name: 'Extra life' }
	};

	// Iconic per-stage chiptunes (Retroix background music). Each stage loops one
	// of these; they cycle so neighbouring stages never share a tune.
	var STAGE_TRACKS = [
		{ tempo: 128, voices: [
			{ wave: 'square', vol: 0.26, notes: 'C5 E5 G5 C6 G5 E5 G5 A5 G5 E5 C5 E5 D5 - G4 -' },
			{ wave: 'triangle', vol: 0.5, notes: 'C3 . . . F3 . . . G3 . . . C3 . . .' } ] },
		{ tempo: 140, voices: [
			{ wave: 'square', vol: 0.24, notes: 'A4 C5 E5 A5 E5 C5 E5 G5 F5 E5 D5 C5 E5 - A4 -' },
			{ wave: 'triangle', vol: 0.5, notes: 'A2 . . . F2 . . . G2 . . . E2 . . .' } ] },
		{ tempo: 116, voices: [
			{ wave: 'square', vol: 0.26, notes: 'D5 F5 A5 D6 A5 F5 A5 C6 A5 F5 D5 F5 E5 - A4 -' },
			{ wave: 'triangle', vol: 0.5, notes: 'D3 . . . A#2 . . . C3 . . . A2 . . .' } ] },
		{ tempo: 152, voices: [
			{ wave: 'square', vol: 0.24, notes: 'E5 G5 B5 E6 D6 B5 G5 B5 A5 G5 F#5 E5 B4 - E5 -' },
			{ wave: 'sawtooth', vol: 0.32, notes: 'E3 E3 . . C3 . . . D3 . . . B2 . . .' } ] }
	];

	function roundRect(x, y, w, h, r) { Retroix.gfx.roundRect(ctx, x, y, w, h, r); }

	/* ------------------------------- setup -------------------------------- */

	function boot() {
		view = Retroix.canvas('#game', LOGICAL.w, LOGICAL.h);
		ctx = view.ctx;
		fx = Retroix.fx(view);
		sfx = Retroix.audio();
		board = Retroix.leaderboard(window.PADDIX_CONFIG);
		screens = Retroix.screens(document);
		[
			'hudScore', 'hudStage', 'hudLives', 'combo',
			'introStage', 'introName', 'introTag',
			'goTitle', 'goScore', 'goSub',
			'initScore', 'initMount', 'lbBody', 'lbMode', 'lbTitle', 'titleTop'
		].forEach(function (id) { el[id] = document.getElementById(id); });

		initEntry = Retroix.initials(el.initMount, { onEnter: submitInitials });
		initEntry.bindKeys();

		bindInput();
		bindButtons();
		showTitle();
		Retroix.loop(step).start();
	}

	/* ------------------------------ stages -------------------------------- */

	function loadStage(idx) {
		stage = STAGES[idx];
		bricks = [];
		stage.rows.forEach(function (row, r) {
			for (var c = 0; c < row.length; c++) {
				var ch = row.charAt(c);
				if (ch === ' ' || ch === '.') { continue; }
				bricks.push(makeBrick(ch, c, r));
			}
		});
		paddle = { w: stage.paddleWidth, baseW: stage.paddleWidth, x: LOGICAL.w / 2 };
		powerups = [];
		particles = [];
		timers.wide = timers.slow = 0;
		combo = 0;
		resetBall();
		sfx.music(STAGE_TRACKS[idx % STAGE_TRACKS.length], { fade: 0.6 });
	}

	function makeBrick(ch, c, r) {
		var hp = ch === 'U' ? Infinity : ch === 'P' ? 1 : parseInt(ch, 10) || 1;
		return {
			x: GRID.left + c * (BRICK_W + GRID.gap),
			y: GRID.top + r * (BRICK_H + GRID.gap),
			w: BRICK_W, h: BRICK_H,
			hp: hp, maxHp: hp,
			type: ch === 'U' ? 'unbreakable' : ch === 'P' ? 'powerup' : 'normal',
			alive: true
		};
	}

	function brickColor(b) {
		if (b.type === 'unbreakable') { return stage.brick.U; }
		if (b.type === 'powerup') { return stage.brick.P; }
		return stage.brick[String(Math.min(b.hp, 3))] || stage.brick['1'];
	}

	function resetBall() {
		balls = [{ x: paddle.x, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0, stuck: true }];
	}

	function targetSpeed() { return stage.ballSpeed * (timers.slow > 0 ? 0.6 : 1); }

	function launchBall() {
		balls.forEach(function (ball) {
			if (ball.stuck) {
				ball.stuck = false;
				var ang = rand(-0.5, 0.5);
				var sp = targetSpeed();
				ball.vx = Math.sin(ang) * sp;
				ball.vy = -Math.abs(Math.cos(ang) * sp);
				sfx.jump();
			}
		});
	}

	/* ------------------------------ game flow ----------------------------- */

	function startGame() {
		score = 0; lives = 3; stageIndex = 0;
		loadStage(0);
		showIntro();
	}

	function showIntro() {
		state = 'intro';
		introTimer = 1.7;
		el.introStage.textContent = 'Stage ' + (stageIndex + 1) + ' / ' + STAGES.length;
		el.introName.textContent = stage.name;
		el.introTag.textContent = stage.tag;
		showScreen('screenIntro');
		updateHud();
	}

	function beginPlay() { state = 'playing'; showScreen(null); }

	function loseLife() {
		lives--;
		updateHud();
		fx.shake(0.7); fx.flash('#ff5e7e', 0.35); sfx.explosion();
		if (lives <= 0) { return endGame(false); }
		resetBall();
	}

	function stageCleared() {
		score += 500;
		sfx.jingle('levelup');
		if (stageIndex >= STAGES.length - 1) { return endGame(true); }
		stageIndex++;
		loadStage(stageIndex);
		showIntro();
	}

	function endGame(won) {
		state = 'ending';
		wonFlag = won;
		sfx.stopMusic(0.4);
		if (won) { score += lives * 200; sfx.jingle('win'); }
		else { sfx.jingle('gameover'); }
		board.qualifies(score).then(function (ok) {
			if (ok) { showInitials(); }
			else { showGameover(won); }
		});
	}

	function showGameover(won) {
		state = 'gameover';
		el.goTitle.textContent = won ? 'You beat Paddix!' : 'Game Over';
		el.goScore.textContent = score.toLocaleString();
		el.goSub.textContent = won
			? 'All ' + STAGES.length + ' stages cleared.'
			: 'Reached stage ' + (stageIndex + 1) + '.';
		showScreen('screenGameover');
	}

	/* --------------------------- initials / lb ---------------------------- */

	function showInitials() {
		state = 'initials';
		initEntry.reset(); initEntry.active = true;
		el.initScore.textContent = score.toLocaleString();
		showScreen('screenInitials');
	}

	function submitInitials() {
		if (state !== 'initials') { return; }
		initEntry.active = false;
		var initials = initEntry.value();
		board.submit(initials, score, stageIndex + 1).then(function () {
			showLeaderboard(initials, wonFlag);
		});
	}

	function showLeaderboard(highlight, won) {
		state = 'leaderboard';
		el.lbTitle.textContent = won ? 'You beat Paddix!' : 'High Scores';
		el.lbMode.textContent = board.mode === 'supabase' ? 'online' : 'this device';
		Retroix.renderLeaderboard(el.lbBody, null, { loadingText: 'Loading…' });
		showScreen('screenLeaderboard');
		board.top().then(function (rows) {
			Retroix.renderLeaderboard(el.lbBody, rows, {
				columns: ['rank', 'initials', 'score', 'stage'],
				highlightInitials: highlight, highlightScore: score,
				emptyText: 'No scores yet — be the first!'
			});
		});
	}

	function refreshTitleTop() {
		board.top(1).then(function (rows) {
			el.titleTop.textContent = rows.length ? 'Best: ' + Number(rows[0].score).toLocaleString() + ' — ' + rows[0].initials : '';
		});
	}

	/* ------------------------------- update ------------------------------- */

	function step(dt) {
		fx.update(dt);
		if (state === 'playing') { update(dt); }
		else if (state === 'intro') {
			introTimer -= dt;
			if (introTimer <= 0) { beginPlay(); }
		}
		render();
	}

	function update(dt) {
		var f = dt * 60;
		updatePaddle(f);
		updateBalls(f);
		updatePowerups(f);
		updateParticles(f);
		if (timers.wide > 0) { timers.wide -= dt; if (timers.wide <= 0) { paddle.w = paddle.baseW; } }
		if (timers.slow > 0) { timers.slow -= dt; }
		checkStageClear();
	}

	function updatePaddle(f) {
		var target;
		if (input.mouseX != null) { target = input.mouseX; }
		else {
			var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
			target = paddle.x + dir * 9 * f;
		}
		paddle.x = clamp(target, paddle.w / 2, LOGICAL.w - paddle.w / 2);
		balls.forEach(function (ball) { if (ball.stuck) { ball.x = paddle.x; ball.y = PADDLE_Y - BALL_R - 1; } });
	}

	function updateBalls(f) {
		for (var bi = balls.length - 1; bi >= 0; bi--) {
			var ball = balls[bi];
			if (ball.stuck) { continue; }

			ball.x += ball.vx * f;
			ball.y += ball.vy * f;

			if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
			else if (ball.x + BALL_R > LOGICAL.w) { ball.x = LOGICAL.w - BALL_R; ball.vx = -Math.abs(ball.vx); }
			if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

			if (ball.vy > 0 && ball.y + BALL_R >= PADDLE_Y && ball.y - BALL_R < PADDLE_Y + PADDLE_H) {
				if (ball.x >= paddle.x - paddle.w / 2 - BALL_R && ball.x <= paddle.x + paddle.w / 2 + BALL_R) {
					var hit = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
					var ang = hit * 1.05;
					var sp = targetSpeed();
					ball.vx = Math.sin(ang) * sp;
					ball.vy = -Math.abs(Math.cos(ang) * sp);
					ball.y = PADDLE_Y - BALL_R - 1;
					combo = 0;
					updateCombo();
					sfx.blip();
				}
			}

			collideBricks(ball);

			var mag = hypot(ball.vx, ball.vy);
			if (mag > 0) { var t = targetSpeed() / mag; ball.vx *= t; ball.vy *= t; }

			if (ball.y - BALL_R > LOGICAL.h) { balls.splice(bi, 1); }
		}
		if (balls.length === 0) { loseLife(); }
	}

	function collideBricks(ball) {
		for (var i = 0; i < bricks.length; i++) {
			var b = bricks[i];
			if (!b.alive) { continue; }
			var cx = clamp(ball.x, b.x, b.x + b.w);
			var cy = clamp(ball.y, b.y, b.y + b.h);
			var dx = ball.x - cx, dy = ball.y - cy;
			if (dx * dx + dy * dy > BALL_R * BALL_R) { continue; }

			var overlapX = (BALL_R + b.w / 2) - Math.abs(ball.x - (b.x + b.w / 2));
			var overlapY = (BALL_R + b.h / 2) - Math.abs(ball.y - (b.y + b.h / 2));
			if (overlapX < overlapY) { ball.vx = -ball.vx; }
			else { ball.vy = -ball.vy; }

			hitBrick(b);
			break;
		}
	}

	function hitBrick(b) {
		if (b.type === 'unbreakable') { spawnParticles(b, '#ffffff', 3); sfx.hit(); return; }
		b.hp--;
		score += 10;
		if (b.hp > 0) { spawnParticles(b, brickColor(b), 4); sfx.hit(); updateHud(); return; }

		b.alive = false;
		combo++;
		score += 50 + combo * 10;
		spawnParticles(b, brickColor(b), 10);
		sfx.coin();
		if (b.type === 'powerup' || Math.random() < stage.powerUpChance) { spawnPowerup(b); }
		updateHud();
		updateCombo();
	}

	function spawnPowerup(b) {
		var keys = ['wide', 'multi', 'slow', 'life'];
		var weights = [30, 26, 22, 12];
		var total = weights.reduce(function (a, c) { return a + c; }, 0);
		var roll = Math.random() * total, kind = keys[0];
		for (var i = 0; i < keys.length; i++) { roll -= weights[i]; if (roll <= 0) { kind = keys[i]; break; } }
		powerups.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, kind: kind, vy: 2.6 });
	}

	function updatePowerups(f) {
		for (var i = powerups.length - 1; i >= 0; i--) {
			var p = powerups[i];
			p.y += p.vy * f;
			if (p.y > LOGICAL.h + 20) { powerups.splice(i, 1); continue; }
			if (p.y >= PADDLE_Y - 6 && p.y <= PADDLE_Y + PADDLE_H + 6 &&
				p.x >= paddle.x - paddle.w / 2 && p.x <= paddle.x + paddle.w / 2) {
				applyPowerup(p.kind);
				powerups.splice(i, 1);
			}
		}
	}

	function applyPowerup(kind) {
		if (kind === 'wide') { paddle.w = Math.min(paddle.baseW * 1.7, 280); timers.wide = 10; }
		else if (kind === 'slow') { timers.slow = 8; }
		else if (kind === 'life') { lives = Math.min(lives + 1, 5); score += 100; updateHud(); }
		else if (kind === 'multi') {
			var extra = [];
			balls.forEach(function (ball) {
				if (ball.stuck) { return; }
				var sp = targetSpeed();
				[-0.4, 0.4].forEach(function (da) {
					if (balls.length + extra.length >= 6) { return; }
					var base = Math.atan2(ball.vy, ball.vx) + da;
					extra.push({ x: ball.x, y: ball.y, vx: Math.cos(base) * sp, vy: Math.sin(base) * sp, stuck: false });
				});
			});
			balls = balls.concat(extra);
		}
		sfx.powerup();
		fx.flash(POWER[kind].color, 0.2);
		flashPower(kind);
	}

	function spawnParticles(b, color, n) {
		for (var i = 0; i < n; i++) {
			particles.push({
				x: b.x + b.w / 2, y: b.y + b.h / 2,
				vx: rand(-3, 3), vy: rand(-3, 1), life: 1, color: color
			});
		}
	}

	function updateParticles(f) {
		for (var i = particles.length - 1; i >= 0; i--) {
			var p = particles[i];
			p.x += p.vx * f; p.y += p.vy * f; p.vy += 0.15 * f; p.life -= 0.03 * f;
			if (p.life <= 0) { particles.splice(i, 1); }
		}
	}

	function checkStageClear() {
		for (var i = 0; i < bricks.length; i++) {
			if (bricks[i].alive && bricks[i].type !== 'unbreakable') { return; }
		}
		stageCleared();
	}

	/* -------------------------------- render ------------------------------ */

	function render() {
		fx.preRender(ctx);

		var g = ctx.createLinearGradient(0, 0, 0, LOGICAL.h);
		g.addColorStop(0, stage ? stage.bg[0] : '#141e30');
		g.addColorStop(1, stage ? stage.bg[1] : '#243b55');
		ctx.fillStyle = g;
		ctx.fillRect(-20, -20, LOGICAL.w + 40, LOGICAL.h + 40);

		if (stage) {
			drawBricks();
			drawPowerups();
			drawPaddle();
			drawBalls();
			drawParticles();
		}
		fx.postRender(ctx);
	}

	function drawBricks() {
		for (var i = 0; i < bricks.length; i++) {
			var b = bricks[i];
			if (!b.alive) { continue; }
			var col = brickColor(b);
			roundRect(b.x, b.y, b.w, b.h, 5);
			ctx.fillStyle = col;
			ctx.fill();
			ctx.fillStyle = 'rgba(255,255,255,.22)';
			roundRect(b.x + 2, b.y + 2, b.w - 4, b.h * 0.4, 4);
			ctx.fill();
			if (b.type === 'unbreakable') {
				ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
				roundRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 4); ctx.stroke();
			} else if (b.type === 'powerup') {
				ctx.fillStyle = 'rgba(0,0,0,.55)';
				ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
				ctx.fillText('★', b.x + b.w / 2, b.y + b.h / 2 + 1);
			}
		}
	}

	function drawPaddle() {
		var x = paddle.x - paddle.w / 2;
		ctx.save();
		ctx.shadowColor = stage.accent; ctx.shadowBlur = 12;
		roundRect(x, PADDLE_Y, paddle.w, PADDLE_H, 7);
		ctx.fillStyle = timers.wide > 0 ? '#4cd964' : stage.accent;
		ctx.fill();
		ctx.restore();
		ctx.fillStyle = 'rgba(255,255,255,.35)';
		roundRect(x + 4, PADDLE_Y + 2, paddle.w - 8, 4, 2);
		ctx.fill();
	}

	function drawBalls() {
		for (var i = 0; i < balls.length; i++) {
			var ball = balls[i];
			var grd = ctx.createRadialGradient(ball.x, ball.y, 1, ball.x, ball.y, BALL_R);
			grd.addColorStop(0, '#ffffff');
			grd.addColorStop(1, timers.slow > 0 ? '#5aa9ff' : '#ffd166');
			ctx.fillStyle = grd;
			ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
		}
	}

	function drawPowerups() {
		for (var i = 0; i < powerups.length; i++) {
			var p = powerups[i], meta = POWER[p.kind];
			ctx.save();
			ctx.shadowColor = meta.color; ctx.shadowBlur = 10;
			roundRect(p.x - 13, p.y - 10, 26, 20, 6);
			ctx.fillStyle = meta.color; ctx.fill();
			ctx.restore();
			ctx.fillStyle = 'rgba(0,0,0,.75)';
			ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
			ctx.fillText(meta.label, p.x, p.y + 1);
		}
	}

	function drawParticles() {
		for (var i = 0; i < particles.length; i++) {
			var p = particles[i];
			ctx.globalAlpha = Math.max(0, p.life);
			ctx.fillStyle = p.color;
			ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
		}
		ctx.globalAlpha = 1;
	}

	/* -------------------------------- HUD --------------------------------- */

	function updateHud() {
		el.hudScore.textContent = score.toLocaleString();
		el.hudStage.textContent = stage ? stage.name : 'Paddix';
		el.hudLives.textContent = '♥'.repeat(Math.max(0, lives));
	}

	var comboTimer;
	function updateCombo() {
		clearTimeout(comboTimer);
		if (combo >= 2) {
			el.combo.textContent = 'COMBO ×' + combo;
			el.combo.classList.add('combo--show');
			comboTimer = setTimeout(function () { el.combo.classList.remove('combo--show'); }, 900);
		} else {
			el.combo.classList.remove('combo--show');
		}
	}

	function flashPower(kind) {
		var meta = POWER[kind];
		el.combo.textContent = meta.name + '!';
		el.combo.style.color = meta.color;
		el.combo.classList.add('combo--show');
		clearTimeout(comboTimer);
		comboTimer = setTimeout(function () {
			el.combo.classList.remove('combo--show');
			el.combo.style.color = '';
		}, 1000);
	}

	/* ------------------------------ screens ------------------------------- */

	function showScreen(id) { if (id) { screens.show(id); } else { screens.hideAll(); } }

	function showTitle() {
		state = 'title';
		stage = null;
		showScreen('screenTitle');
		el.hudScore.textContent = '0';
		el.hudStage.textContent = 'Paddix';
		el.hudLives.textContent = '';
		refreshTitleTop();
		sfx.music('title');
	}

	function togglePause() {
		if (state === 'playing') { state = 'paused'; showScreen('screenPause'); sfx.pauseMusic(); }
		else if (state === 'paused') { showScreen(null); state = 'playing'; sfx.resumeMusic(); }
	}

	/* ------------------------------- input -------------------------------- */

	function pointerX(clientX) { return clamp(view.toLogical(clientX, 0).x, 0, LOGICAL.w); }

	function bindInput() {
		var canvas = view.canvas;
		canvas.addEventListener('mousemove', function (e) { input.mouseX = pointerX(e.clientX); });
		canvas.addEventListener('mousedown', function () { if (state === 'playing') { launchBall(); } });
		canvas.addEventListener('touchstart', function (e) {
			input.mouseX = pointerX(e.touches[0].clientX);
			if (state === 'playing') { launchBall(); }
			e.preventDefault();
		}, { passive: false });
		canvas.addEventListener('touchmove', function (e) {
			input.mouseX = pointerX(e.touches[0].clientX);
			e.preventDefault();
		}, { passive: false });

		document.addEventListener('keydown', function (e) {
			var k = e.key;
			if (state === 'initials') { return; }   // Retroix initials entry handles keys
			if (k === 'ArrowLeft') { input.left = true; input.mouseX = null; }
			else if (k === 'ArrowRight') { input.right = true; input.mouseX = null; }
			else if (k === ' ' || k === 'Enter') {
				if (state === 'title') { startGame(); }
				else if (state === 'playing') { launchBall(); }
				else if (state === 'intro') { beginPlay(); }
				e.preventDefault();
			}
			else if (k === 'p' || k === 'P' || k === 'Escape') { togglePause(); }
			else if (k === 'm' || k === 'M') { sfx.toggle(); }
		});
		document.addEventListener('keyup', function (e) {
			if (e.key === 'ArrowLeft') { input.left = false; }
			else if (e.key === 'ArrowRight') { input.right = false; }
		});
	}

	function bindButtons() {
		on('btnPlay', startGame);
		on('btnHow', function () { showScreen('screenHowto'); });
		on('btnHowClose', showTitle);
		on('btnTitleLb', function () { showLeaderboard(null, false); });
		on('btnAgain', startGame);
		on('btnMenu', showTitle);
		on('btnLbFromGo', function () { showLeaderboard(null, false); });
		on('btnLbAgain', startGame);
		on('btnLbMenu', showTitle);
		on('btnInitEnter', submitInitials);
		on('btnResume', togglePause);
		on('btnPauseMenu', showTitle);
	}

	function on(id, fn) {
		var node = document.getElementById(id);
		if (node) { node.addEventListener('click', fn); }
	}

	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
	else { boot(); }
})();
