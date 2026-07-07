/*
 * Paddix — a canvas brick-breaker.
 *
 * Rebuilt from the original 2011 jQuery/DOM version into a dependency-free
 * canvas game: 8 themed stages, power-ups, combos, lives and a retro
 * high-score leaderboard (see leaderboard.js).
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

	var canvas, ctx, dpr = 1;
	var el = {};
	var raf, lastTime;

	// --- game state ---
	var state = 'title';
	var stageIndex = 0, score = 0, lives = 3, combo = 0;
	var stage, paddle, balls, bricks, powerups, particles;
	var timers = { wide: 0, slow: 0 };
	var input = { mouseX: null, left: false, right: false };
	var introTimer = 0;
	var shake = 0;

	var POWER = {
		wide:  { label: 'W', color: '#4cd964', name: 'Wide paddle' },
		multi: { label: 'M', color: '#00e5ff', name: 'Multiball' },
		slow:  { label: 'S', color: '#5aa9ff', name: 'Slow-mo' },
		life:  { label: '+', color: '#ff5e7e', name: 'Extra life' }
	};

	/* ------------------------------ helpers ------------------------------- */

	function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
	function rand(a, b) { return a + Math.random() * (b - a); }
	function hypot(x, y) { return Math.sqrt(x * x + y * y); }

	function roundRect(x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	}

	/* ------------------------------- setup -------------------------------- */

	function boot() {
		canvas = document.getElementById('game');
		ctx = canvas.getContext('2d');
		[
			'hudScore', 'hudStage', 'hudLives', 'combo',
			'screenTitle', 'screenIntro', 'screenPause', 'screenGameover',
			'screenInitials', 'screenLeaderboard', 'screenHowto',
			'introStage', 'introName', 'introTag',
			'goTitle', 'goScore', 'goSub',
			'initScore', 'lbBody', 'lbMode', 'lbTitle', 'titleTop'
		].forEach(function (id) { el[id] = document.getElementById(id); });

		resize();
		window.addEventListener('resize', resize);
		bindInput();
		bindButtons();
		showTitle();
		lastTime = performance.now();
		raf = requestAnimationFrame(loop);
	}

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = LOGICAL.w * dpr;
		canvas.height = LOGICAL.h * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
		shake = 12;
		if (lives <= 0) { return endGame(false); }
		resetBall();
	}

	function stageCleared() {
		score += 500;
		if (stageIndex >= STAGES.length - 1) { return endGame(true); }
		stageIndex++;
		loadStage(stageIndex);
		showIntro();
	}

	function endGame(won) {
		state = 'ending';
		if (won) { score += lives * 200; }
		Leaderboard.qualifies(score).then(function (ok) {
			if (ok) { showInitials(won); }
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

	/* --------------------------- initials entry --------------------------- */

	var initSlots = ['A', 'A', 'A'];
	var initCursor = 0;

	function showInitials(won) {
		state = 'initials';
		initSlots = ['A', 'A', 'A'];
		initCursor = 0;
		el.initScore.textContent = score.toLocaleString();
		renderInitials();
		showScreen('screenInitials');
		el.screenInitials.dataset.won = won ? '1' : '';
	}

	function renderInitials() {
		var slots = el.screenInitials.querySelectorAll('.slot');
		slots.forEach(function (s, i) {
			s.querySelector('.slot__ch').textContent = initSlots[i];
			s.classList.toggle('slot--active', i === initCursor);
		});
	}

	function cycleSlot(i, dir) {
		var code = initSlots[i].charCodeAt(0) - 65;
		code = (code + dir + 26) % 26;
		initSlots[i] = String.fromCharCode(65 + code);
		initCursor = i;
		renderInitials();
	}

	function submitInitials() {
		var won = el.screenInitials.dataset.won === '1';
		var initials = initSlots.join('');
		Leaderboard.submit(initials, score, stageIndex + 1).then(function () {
			showLeaderboard(initials, won);
		});
	}

	/* ----------------------------- leaderboard ---------------------------- */

	function showLeaderboard(highlight, won) {
		state = 'leaderboard';
		el.lbTitle.textContent = won ? 'You beat Paddix!' : 'High Scores';
		el.lbMode.textContent = Leaderboard.mode === 'supabase' ? 'online' : 'this device';
		el.lbBody.innerHTML = '<tr><td colspan="4" class="lb-loading">Loading…</td></tr>';
		showScreen('screenLeaderboard');
		Leaderboard.top().then(function (rows) {
			if (!rows.length) { el.lbBody.innerHTML = '<tr><td colspan="4" class="lb-loading">No scores yet — be the first!</td></tr>'; return; }
			var used = false;
			el.lbBody.innerHTML = rows.map(function (row, i) {
				var isMe = !used && highlight && row.initials === highlight && row.score === score;
				if (isMe) { used = true; }
				return '<tr' + (isMe ? ' class="lb-me"' : '') + '>' +
					'<td>' + (i + 1) + '</td>' +
					'<td class="lb-ini">' + escapeHtml(row.initials) + '</td>' +
					'<td class="lb-score">' + Number(row.score).toLocaleString() + '</td>' +
					'<td>' + (row.stage || '-') + '</td></tr>';
			}).join('');
		});
	}

	function refreshTitleTop() {
		Leaderboard.top(1).then(function (rows) {
			if (rows.length) {
				el.titleTop.textContent = 'Best: ' + Number(rows[0].score).toLocaleString() + ' — ' + rows[0].initials;
			} else {
				el.titleTop.textContent = '';
			}
		});
	}

	function escapeHtml(s) {
		return String(s).replace(/[&<>"]/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
		});
	}

	/* ------------------------------- update ------------------------------- */

	function loop(now) {
		var dt = Math.min((now - lastTime) / 1000, 0.05);
		lastTime = now;
		if (state === 'playing') { update(dt); }
		else if (state === 'intro') {
			introTimer -= dt;
			if (introTimer <= 0) { beginPlay(); }
		}
		render();
		raf = requestAnimationFrame(loop);
	}

	function update(dt) {
		var f = dt * 60;
		updatePaddle(f);
		updateBalls(f);
		updatePowerups(f);
		updateParticles(f);
		if (timers.wide > 0) { timers.wide -= dt; if (timers.wide <= 0) { paddle.w = paddle.baseW; } }
		if (timers.slow > 0) { timers.slow -= dt; }
		if (shake > 0) { shake = Math.max(0, shake - f); }
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

			// walls
			if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
			else if (ball.x + BALL_R > LOGICAL.w) { ball.x = LOGICAL.w - BALL_R; ball.vx = -Math.abs(ball.vx); }
			if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

			// paddle
			if (ball.vy > 0 && ball.y + BALL_R >= PADDLE_Y && ball.y - BALL_R < PADDLE_Y + PADDLE_H) {
				if (ball.x >= paddle.x - paddle.w / 2 - BALL_R && ball.x <= paddle.x + paddle.w / 2 + BALL_R) {
					var hit = clamp((ball.x - paddle.x) / (paddle.w / 2), -1, 1);
					var ang = hit * 1.05; // up to ~60°
					var sp = targetSpeed();
					ball.vx = Math.sin(ang) * sp;
					ball.vy = -Math.abs(Math.cos(ang) * sp);
					ball.y = PADDLE_Y - BALL_R - 1;
					combo = 0;
					updateCombo();
				}
			}

			collideBricks(ball);

			// normalise to the target speed so slow-mo applies immediately
			var mag = hypot(ball.vx, ball.vy);
			if (mag > 0) { var t = targetSpeed() / mag; ball.vx *= t; ball.vy *= t; }

			// lost
			if (ball.y - BALL_R > LOGICAL.h) { balls.splice(bi, 1); }
		}
		if (balls.length === 0) { loseLife(); }
	}

	function collideBricks(ball) {
		for (var i = 0; i < bricks.length; i++) {
			var b = bricks[i];
			if (!b.alive) { continue; }
			// closest point on brick to ball centre
			var cx = clamp(ball.x, b.x, b.x + b.w);
			var cy = clamp(ball.y, b.y, b.y + b.h);
			var dx = ball.x - cx, dy = ball.y - cy;
			if (dx * dx + dy * dy > BALL_R * BALL_R) { continue; }

			// reflect on the axis of shallowest penetration
			var overlapX = (BALL_R + b.w / 2) - Math.abs(ball.x - (b.x + b.w / 2));
			var overlapY = (BALL_R + b.h / 2) - Math.abs(ball.y - (b.y + b.h / 2));
			if (overlapX < overlapY) { ball.vx = -ball.vx; }
			else { ball.vy = -ball.vy; }

			hitBrick(b);
			break; // one brick per ball per frame
		}
	}

	function hitBrick(b) {
		if (b.type === 'unbreakable') { spawnParticles(b, '#ffffff', 3); return; }
		b.hp--;
		score += 10;
		if (b.hp > 0) { spawnParticles(b, brickColor(b), 4); updateHud(); return; }

		b.alive = false;
		combo++;
		score += 50 + combo * 10;
		spawnParticles(b, brickColor(b), 10);
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
			// catch
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
		ctx.save();
		if (shake > 0) { ctx.translate(rand(-shake, shake) * 0.4, rand(-shake, shake) * 0.4); }

		// background
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
		ctx.restore();
	}

	function drawBricks() {
		for (var i = 0; i < bricks.length; i++) {
			var b = bricks[i];
			if (!b.alive) { continue; }
			var col = brickColor(b);
			roundRect(b.x, b.y, b.w, b.h, 5);
			ctx.fillStyle = col;
			ctx.fill();
			// top gloss
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

	function showScreen(id) {
		['screenTitle', 'screenIntro', 'screenPause', 'screenGameover',
		 'screenInitials', 'screenLeaderboard', 'screenHowto'].forEach(function (s) {
			el[s].hidden = (s !== id);
		});
	}

	function showTitle() {
		state = 'title';
		stage = null;
		showScreen('screenTitle');
		el.hudScore.textContent = '0';
		el.hudStage.textContent = 'Paddix';
		el.hudLives.textContent = '';
		refreshTitleTop();
	}

	function togglePause() {
		if (state === 'playing') { state = 'paused'; showScreen('screenPause'); }
		else if (state === 'paused') { showScreen(null); state = 'playing'; }
	}

	/* ------------------------------- input -------------------------------- */

	function pointerX(clientX) {
		var rect = canvas.getBoundingClientRect();
		return clamp((clientX - rect.left) / rect.width * LOGICAL.w, 0, LOGICAL.w);
	}

	function bindInput() {
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
			if (state === 'initials') { return handleInitialsKey(e); }
			if (k === 'ArrowLeft') { input.left = true; input.mouseX = null; }
			else if (k === 'ArrowRight') { input.right = true; input.mouseX = null; }
			else if (k === ' ' || k === 'Enter') {
				if (state === 'title') { startGame(); }
				else if (state === 'playing') { launchBall(); }
				else if (state === 'intro') { beginPlay(); }
				e.preventDefault();
			}
			else if (k === 'p' || k === 'P' || k === 'Escape') { togglePause(); }
		});
		document.addEventListener('keyup', function (e) {
			if (e.key === 'ArrowLeft') { input.left = false; }
			else if (e.key === 'ArrowRight') { input.right = false; }
		});
	}

	function handleInitialsKey(e) {
		var k = e.key;
		if (/^[a-zA-Z]$/.test(k)) {
			initSlots[initCursor] = k.toUpperCase();
			if (initCursor < 2) { initCursor++; }
			renderInitials();
		} else if (k === 'ArrowUp') { cycleSlot(initCursor, 1); }
		else if (k === 'ArrowDown') { cycleSlot(initCursor, -1); }
		else if (k === 'ArrowLeft') { initCursor = Math.max(0, initCursor - 1); renderInitials(); }
		else if (k === 'ArrowRight') { initCursor = Math.min(2, initCursor + 1); renderInitials(); }
		else if (k === 'Backspace') { initCursor = Math.max(0, initCursor - 1); renderInitials(); }
		else if (k === 'Enter') { submitInitials(); }
		e.preventDefault();
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

		// initials slot controls (touch)
		el.screenInitials.querySelectorAll('.slot').forEach(function (slot, i) {
			slot.querySelector('.slot__up').addEventListener('click', function () { cycleSlot(i, 1); });
			slot.querySelector('.slot__down').addEventListener('click', function () { cycleSlot(i, -1); });
			slot.addEventListener('click', function (e) { if (e.target === slot || e.target.classList.contains('slot__ch')) { initCursor = i; renderInitials(); } });
		});
	}

	function on(id, fn) {
		var node = document.getElementById(id);
		if (node) { node.addEventListener('click', fn); }
	}

	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); }
	else { boot(); }
})();
