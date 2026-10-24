(function () {
    var W = 480, H = 640, cv = document.getElementById('c'), ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    var $ = function (i) { return document.getElementById(i) };
    var menu = $('menu'), scoreEl = $('score'), comboEl = $('combo'), livesEl = $('lives');
    var best = 0; try { best = +localStorage.getItem('blobby-best') || 0 } catch (e) { }
    $('best').textContent = best ? 'Best: ' + best : '';

    var GOOD = ['🍓', '🍌', '🍇', '🍉', '🍍', '🍒'];
    var p, items, parts, score, lives, combo, streak, t, spawn, shield, shake, running, keys = {}, stars = [], audio;
    for (var i = 0; i < 40; i++)stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + .5, s: Math.random() * 20 + 10 });

    function beep(f, d, type, v) {
        try {
            audio = audio || new (window.AudioContext || window.webkitAudioContext)();
            var o = audio.createOscillator(), g = audio.createGain();
            o.type = type || 'sine'; o.frequency.value = f; g.gain.value = v || .06;
            g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + d);
            o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + d);
        } catch (e) { }
    }

    function reset() {
        p = { x: W / 2, tx: W / 2, y: H - 78, r: 34, mouth: 0, squash: 0, hurt: 0 };
        items = []; parts = []; score = 0; lives = 3; combo = 0; streak = 0; t = 0; spawn = 0; shield = 0; shake = 0;
        hud();
    }
    function hud() {
        scoreEl.textContent = score;
        var m = mult(); comboEl.textContent = 'x' + m;
        livesEl.textContent = lives > 0 ? '❤️'.repeat(lives) : '💔';
    }
    function mult() { return Math.min(5, 1 + Math.floor(combo / 5)) }

    function spawnItem() {
        var lvl = t / 18, r = Math.random(), type = 'good';
        var bombChance = Math.min(.34, .14 + lvl * .03);
        if (r < bombChance) type = 'bomb';
        else if (r < bombChance + .04) type = 'star';
        else if (r < bombChance + .07 && lives < 5) type = 'heart';
        items.push({
            type: type, x: 30 + Math.random() * (W - 60), y: -30,
            vy: 130 + Math.min(190, lvl * 22) + Math.random() * 50,
            rot: 0, vr: (Math.random() - .5) * 4, r: 22,
            e: type === 'good' ? GOOD[Math.floor(Math.random() * GOOD.length)] : type === 'bomb' ? '💣' : type === 'star' ? '⭐' : '💖'
        });
    }

    function burst(x, y, col, n, txt) {
        for (var i = 0; i < n; i++) {
            var a = Math.random() * 6.283, s = 60 + Math.random() * 180;
            parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: .6 + Math.random() * .4, max: 1, col: col, r: 3 + Math.random() * 4 });
        }
        if (txt) parts.push({ x: x, y: y - 20, vx: 0, vy: -70, life: .8, max: .8, txt: txt, col: col });
    }

    function hit(it) {
        if (it.type === 'good') {
            combo++; streak++;
            var m = mult(), pts = 10 * m; score += pts; p.mouth = .25; p.squash = .25;
            burst(it.x, it.y, '#ffd23f', 10, '+' + pts);
            beep(400 + Math.min(combo, 20) * 30, .12, 'triangle');
            if (combo % 5 === 0) { comboEl.classList.add('pop'); setTimeout(function () { comboEl.classList.remove('pop') }, 140); beep(900, .2, 'square', .04); }
        } else if (it.type === 'star') {
            shield = 6; burst(it.x, it.y, '#7af7ff', 16, 'Shield!'); beep(700, .3, 'sine');
        } else if (it.type === 'heart') {
            lives = Math.min(5, lives + 1); burst(it.x, it.y, '#ff3d81', 14, '+1 life'); beep(600, .25, 'sine');
        } else {
            if (shield > 0) { burst(it.x, it.y, '#7af7ff', 14, 'Blocked!'); beep(250, .15, 'square', .04); }
            else {
                lives--; combo = 0; shake = .35; p.hurt = .5; burst(it.x, it.y, '#ff5a3c', 22, 'Ouch!'); beep(110, .35, 'sawtooth', .08);
                if (lives <= 0) { end(); }
            }
        }
        hud();
    }

    function end() {
        running = false;
        var nb = score > best;
        if (nb) { best = score; try { localStorage.setItem('blobby-best', best) } catch (e) { } }
        $('mtitle').textContent = nb ? 'New best!' : 'Blob is full!';
        $('mtext').textContent = 'You scored ' + score + (nb ? '. Nobody has eaten more.' : '. Best is ' + best + '. Beat it?');
        $('best').textContent = '';
        $('play').textContent = 'Play again';
        setTimeout(function () { menu.classList.remove('hide'); $('play').focus() }, 650);
    }

    function update(dt) {
        t += dt;
        if (keys.ArrowLeft || keys.a) p.tx -= 420 * dt;
        if (keys.ArrowRight || keys.d) p.tx += 420 * dt;
        p.tx = Math.max(p.r, Math.min(W - p.r, p.tx));
        p.x += (p.tx - p.x) * Math.min(1, dt * 14);
        p.mouth = Math.max(0, p.mouth - dt); p.squash = Math.max(0, p.squash - dt); p.hurt = Math.max(0, p.hurt - dt);
        shield = Math.max(0, shield - dt); shake = Math.max(0, shake - dt);
        spawn -= dt;
        if (spawn <= 0) { spawnItem(); spawn = Math.max(.32, .85 - t * .008) * (.7 + Math.random() * .6); }
        for (var i = items.length - 1; i >= 0; i--) {
            var it = items[i]; it.y += it.vy * dt; it.rot += it.vr * dt;
            var dx = it.x - p.x, dy = it.y - p.y;
            if (dx * dx + dy * dy < (p.r + it.r - 4) * (p.r + it.r - 4)) { hit(it); items.splice(i, 1); if (!running) return; continue; }
            if (it.y > H + 30) {
                if (it.type === 'good' && combo > 0) { combo = 0; hud(); }
                items.splice(i, 1);
            }
        }
        for (i = parts.length - 1; i >= 0; i--) {
            var q = parts[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (!q.txt) q.vy += 420 * dt;
            if (q.life <= 0) parts.splice(i, 1);
        }
        for (i = 0; i < stars.length; i++) { var s = stars[i]; s.y += s.s * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W } }
    }

    function drawBlob() {
        var sq = p.squash / .25, w = p.r * (1 + .18 * sq), h = p.r * (1 - .14 * sq);
        ctx.save(); ctx.translate(p.x, p.y);
        if (shield > 0) {
            ctx.globalAlpha = shield < 1.5 ? (Math.sin(t * 30) > 0 ? 1 : .3) : .9;
            ctx.strokeStyle = '#7af7ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, p.r + 12 + Math.sin(t * 8) * 2, 0, 6.283); ctx.stroke();
            ctx.globalAlpha = 1;
        }
        var g = ctx.createRadialGradient(-10, -14, 4, 0, 0, p.r + 6);
        g.addColorStop(0, p.hurt > 0 ? '#ff9a8a' : '#b6ff4d'); g.addColorStop(1, p.hurt > 0 ? '#e03a2a' : '#4cc20a');
        ctx.fillStyle = g; ctx.strokeStyle = '#1b0a4d'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, 6.283); ctx.fill(); ctx.stroke();
        // eyes follow nearest falling item
        var tx = 0, ty = 0, best = 1e9;
        for (var i = 0; i < items.length; i++) { var d = Math.abs(items[i].y - p.y); if (d < best) { best = d; tx = items[i].x - p.x; ty = items[i].y - p.y; } }
        var len = Math.hypot(tx, ty) || 1, ex = tx / len * 4, ey = ty / len * 4;
        [-12, 12].forEach(function (x) {
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, -8, 9, 0, 6.283); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1b0a4d'; ctx.beginPath(); ctx.arc(x + ex, -8 + ey, 4, 0, 6.283); ctx.fill();
        });
        ctx.fillStyle = '#1b0a4d'; ctx.beginPath();
        if (p.mouth > 0) { ctx.ellipse(0, 12, 11, 11 * Math.min(1, p.mouth / .15), 0, 0, 6.283); }
        else if (p.hurt > 0) { ctx.ellipse(0, 15, 8, 4, 0, 0, 6.283); }
        else { ctx.arc(0, 8, 9, .15, Math.PI - .15); }
        ctx.fill();
        ctx.restore();
    }

    function draw() {
        ctx.save();
        ctx.clearRect(0, 0, W, H);
        if (shake > 0) ctx.translate((Math.random() - .5) * 12 * shake / .35, (Math.random() - .5) * 12 * shake / .35);
        ctx.fillStyle = 'rgba(255,241,214,.55)';
        stars.forEach(function (s) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); });
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        items.forEach(function (it) {
            ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
            ctx.font = '38px serif'; ctx.fillText(it.e, 0, 2); ctx.restore();
        });
        drawBlob();
        parts.forEach(function (q) {
            ctx.globalAlpha = Math.max(0, q.life / (q.max || 1));
            if (q.txt) { ctx.font = '700 22px Fredoka,sans-serif'; ctx.fillStyle = q.col; ctx.strokeStyle = '#1b0a4d'; ctx.lineWidth = 4; ctx.strokeText(q.txt, q.x, q.y); ctx.fillText(q.txt, q.x, q.y); }
            else { ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.283); ctx.fill(); }
        });
        ctx.globalAlpha = 1; ctx.restore();
    }

    var last = 0;
    function loop(ts) {
        var dt = Math.min(.04, (ts - last) / 1000 || 0); last = ts;
        if (running) update(dt);
        else { for (var i = 0; i < stars.length; i++) { stars[i].y = (stars[i].y + stars[i].s * dt) % H; } for (i = parts.length - 1; i >= 0; i--) { var q = parts[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (!q.txt) q.vy += 420 * dt; if (q.life <= 0) parts.splice(i, 1); } }
        draw(); requestAnimationFrame(loop);
    }

    function pointer(e) {
        var r = cv.getBoundingClientRect();
        if (p) p.tx = (e.clientX - r.left) / r.width * W;
    }
    cv.addEventListener('pointermove', pointer);
    cv.addEventListener('pointerdown', pointer);
    window.addEventListener('keydown', function (e) { keys[e.key] = true; if (e.key.indexOf('Arrow') === 0) e.preventDefault(); });
    window.addEventListener('keyup', function (e) { keys[e.key] = false; });

    $('play').addEventListener('click', function () {
        reset(); menu.classList.add('hide'); running = true; beep(520, .15, 'triangle'); cv.focus();
    });

    reset(); requestAnimationFrame(loop);
})();
