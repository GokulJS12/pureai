// Shared by both dynamically mounted contact dialogs; no visitor data is persisted.
let pureaiSecurityScript;
function pureaiLoadSecurity() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!pureaiSecurityScript) pureaiSecurityScript = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timer = setTimeout(() => reject(new Error('Security check unavailable. Please retry.')), 12000);
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.onload = () => { clearTimeout(timer); resolve(window.turnstile); };
        script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Security check unavailable. Please retry.')); };
        document.head.appendChild(script);
    }).catch(error => { pureaiSecurityScript = null; throw error; });
    return pureaiSecurityScript;
}
function pureaiBindInquiry(form, source, readFields, onAccepted) {
    const notice = document.createElement('div');
    notice.style.cssText = 'font-size:12px;line-height:1.6;margin:12px 0;color:inherit';
    notice.innerHTML = `<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="inquiry-consent" required style="width:auto;margin-top:4px"> <span>I agree that Pure AI may use these details to respond to my inquiry. <a href="/inquiry-privacy" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">Inquiry privacy notice</a>. No marketing signup.</span></label><label hidden>Leave blank<input name="website" tabindex="-1" autocomplete="off"></label><div data-security></div><p data-inquiry-status role="status" aria-live="polite" tabindex="-1"></p>`;
    form.insertBefore(notice, form.querySelector('button[type="submit"]'));
    const status = notice.querySelector('[data-inquiry-status]');
    let pending = false;
    let requestId;
    let lastPayload;
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (pending || !form.reportValidity()) return;
        pending = true;
        const button = form.querySelector('button[type="submit"]');
        const original = button.innerHTML;
        button.disabled = true;
        button.textContent = 'Sending…';
        form.setAttribute('aria-busy', 'true');
        status.textContent = 'Checking security and submitting your inquiry…';
        let widget;
        try {
            const fields = readFields();
            const fingerprint = JSON.stringify(fields);
            if (fingerprint !== lastPayload) { requestId = crypto.randomUUID(); lastPayload = fingerprint; }
            const configResponse = await fetch('/api/inquiries', { cache: 'no-store', signal: AbortSignal.timeout(12000) });
            const config = await configResponse.json();
            if (!configResponse.ok || typeof config.siteKey !== 'string') throw new Error('Inquiry service is unavailable. Please retry or email gkai@pureaiglobal.com directly.');
            const security = await pureaiLoadSecurity();
            const token = await new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('Security check timed out. Please retry.')), 120000);
                const fail = () => { clearTimeout(timer); reject(new Error('Security check failed. Please retry.')); };
                widget = security.render(notice.querySelector('[data-security]'), { sitekey: config.siteKey, action: 'inquiry', callback: token => { clearTimeout(timer); resolve(token); }, 'error-callback': fail, 'expired-callback': fail });
            });
            const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, source, requestId, consent: notice.querySelector('[name="inquiry-consent"]').checked, website: notice.querySelector('[name="website"]').value, token }), signal: AbortSignal.timeout(20000) });
            const result = await response.json();
            if (response.status !== 202 || result.accepted !== true || result.reference !== requestId) throw new Error(result.error || 'Delivery was not confirmed. Please retry.');
            status.textContent = `Your inquiry has been accepted for delivery. Reference: ${result.reference}. Response times vary.`;
            onAccepted(result);
            form.reset();
            requestId = lastPayload = undefined;
        } catch (error) {
            status.textContent = error instanceof SyntaxError || error.name === 'TimeoutError' || error.name === 'TypeError' ? 'Delivery could not be confirmed. Your details are still here. Please retry or email gkai@pureaiglobal.com directly.' : error.message;
            status.focus();
        } finally {
            if (widget !== undefined && window.turnstile) window.turnstile.remove(widget);
            pending = false;
            button.disabled = false;
            button.innerHTML = original;
            form.removeAttribute('aria-busy');
        }
    });
}

/**
 * ═══════════════════════════════════════════════════════════
 * PURE AI — Immersive Cinematic Experience v3
 * Sci-fi octopus tentacles + scroll effects + all features
 * ═══════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────
    // 1. SCI-FI TENTACLE NEBULA (Canvas 2D)
    //    Abstract octopus tentacles — no head, only flowing
    //    neural tendrils that react to mouse + scroll
    // ─────────────────────────────────────────────────────
    const canvas = document.getElementById('webgl-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let W, H;
    let mouseX = -9999, mouseY = -9999;
    let targetMX = -9999, targetMY = -9999;
    let scrollRatio = 0;
    let currentScroll = 0;
    let time = 0;

    // Tentacle config
    const TENTACLE_COUNT = 10;
    const SEGMENTS_PER_TENTACLE = 45;
    const SEGMENT_LENGTH = 8;

    // Colors matching the site scheme
    const TENTACLE_COLORS = [
        { r: 77, g: 238, b: 234 },   // Cyan
        { r: 100, g: 200, b: 240 },  // Light blue
        { r: 123, g: 97, b: 246 },   // Violet
        { r: 80, g: 180, b: 255 },   // Sky
        { r: 160, g: 120, b: 255 },  // Lavender
        { r: 60, g: 220, b: 220 },   // Teal
    ];

    // Ambient particles floating along tentacles
    const ambientParticles = [];
    const AMBIENT_COUNT = 100; // Drastically reduced for performance! (100 is buttery smooth vs 250)

    class Tentacle {
        constructor(index) {
            this.index = index;
            this.segments = [];
            this.originX = 0;
            this.originY = 0;
            this.phase = (index / TENTACLE_COUNT) * Math.PI * 2;
            this.speed = 0.008 + Math.random() * 0.012;
            this.amplitude = 30 + Math.random() * 50;
            this.frequency = 0.05 + Math.random() * 0.04;
            this.thickness = 2 + Math.random() * 3;
            this.colorIndex = index % TENTACLE_COLORS.length;
            this.length = SEGMENTS_PER_TENTACLE + Math.floor(Math.random() * 20);
            this.curl = 0.003 + Math.random() * 0.008;
            this.spreadAngle = 0;
            this.mouseInfluence = 0.3 + Math.random() * 0.5;

            // Initialize segments
            for (let i = 0; i < this.length; i++) {
                this.segments.push({ x: 0, y: 0, angle: 0 });
            }
        }

        update(time, mouseX, mouseY, scrollRatio, globalCX, globalCY) {
            // Origin point — anchored dynamically via globalCX/globalCY
            const centerX = globalCX !== undefined ? globalCX : W * 0.5;
            const centerY = globalCY !== undefined ? globalCY : H * 0.55;
            const spread = (scrollRatio * 0.5 + 0.3);

            this.spreadAngle = this.phase + Math.sin(time * 0.3 + this.phase) * 0.2;

            this.originX = centerX;
            this.originY = centerY;

            // First segment at origin
            this.segments[0].x = this.originX;
            this.segments[0].y = this.originY;

            // Base direction — outward from center
            let baseAngle = this.spreadAngle + Math.PI * 0.5 * Math.sin(this.phase);
            baseAngle += scrollRatio * 0.5;

            this.segments[0].angle = baseAngle;

            // Propagate segments with wave motion
            for (let i = 1; i < this.length; i++) {
                const prev = this.segments[i - 1];
                const seg = this.segments[i];
                const t = i / this.length;

                // Organic wave
                const wave = Math.sin(time * this.speed * 80 + i * this.frequency + this.phase) *
                    this.amplitude * t * (0.5 + scrollRatio * 0.5);

                // Curl increases toward tip
                const curlAmount = this.curl * (1 + t * 3) * Math.sin(time * 0.5 + this.phase + i * 0.1);

                // Mouse attraction/repulsion
                let mouseForceX = 0, mouseForceY = 0;
                if (mouseX > 0 && mouseY > 0) {
                    const dx = mouseX - seg.x;
                    const dy = mouseY - seg.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 400 && dist > 0) {
                        const force = (400 - dist) / 400 * this.mouseInfluence * t;
                        mouseForceX = (dx / dist) * force * 15;
                        mouseForceY = (dy / dist) * force * 15;
                    }
                }

                // Calculate angle
                let angle = prev.angle + curlAmount;
                angle += Math.sin(wave * 0.02) * 0.1;

                seg.angle = angle;
                seg.x = prev.x + Math.cos(angle) * SEGMENT_LENGTH + mouseForceX + Math.sin(wave * 0.01 + i) * t * 2;
                seg.y = prev.y + Math.sin(angle) * SEGMENT_LENGTH + mouseForceY + Math.cos(wave * 0.01 + i) * t * 2;
            }
        }

        draw(ctx, time) {
            const color = TENTACLE_COLORS[this.colorIndex];

            // Draw main tentacle body as smooth curve
            ctx.beginPath();
            ctx.moveTo(this.segments[0].x, this.segments[0].y);

            for (let i = 1; i < this.length - 1; i++) {
                const curr = this.segments[i];
                const next = this.segments[i + 1];
                const mx = (curr.x + next.x) / 2;
                const my = (curr.y + next.y) / 2;
                ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
            }

            const lastSeg = this.segments[this.length - 1];
            ctx.lineTo(lastSeg.x, lastSeg.y);

            // Thickness tapers toward tip
            const t = 1;
            ctx.lineWidth = this.thickness;
            ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},0.15)`;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Draw inner glow line (brighter, thinner)
            ctx.beginPath();
            ctx.moveTo(this.segments[0].x, this.segments[0].y);
            for (let i = 1; i < this.length - 1; i++) {
                const curr = this.segments[i];
                const next = this.segments[i + 1];
                const mx = (curr.x + next.x) / 2;
                const my = (curr.y + next.y) / 2;
                ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
            }
            ctx.lineTo(lastSeg.x, lastSeg.y);
            ctx.lineWidth = this.thickness * 0.4;
            ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},0.35)`;
            ctx.stroke();

            // Draw bright core line
            ctx.beginPath();
            ctx.moveTo(this.segments[0].x, this.segments[0].y);
            for (let i = 1; i < this.length - 1; i++) {
                const curr = this.segments[i];
                const next = this.segments[i + 1];
                const mx = (curr.x + next.x) / 2;
                const my = (curr.y + next.y) / 2;
                ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
            }
            ctx.lineTo(lastSeg.x, lastSeg.y);
            ctx.lineWidth = this.thickness * 0.12;
            ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},0.7)`;
            ctx.stroke();

            // Glow at nodes (every few segments)
            for (let i = 0; i < this.length; i += 8) {
                const seg = this.segments[i];
                const t = i / this.length;
                const pulse = 0.5 + 0.5 * Math.sin(time * 2 + i * 0.3 + this.phase);
                const radius = (3 - t * 2.5) * pulse;

                if (radius > 0.5) {
                    // Glow halo
                    const grad = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, radius * 6);
                    grad.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${0.08 * pulse})`);
                    grad.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
                    ctx.fillStyle = grad;
                    ctx.fillRect(seg.x - radius * 6, seg.y - radius * 6, radius * 12, radius * 12);

                    // Bright dot
                    ctx.beginPath();
                    ctx.arc(seg.x, seg.y, radius * 0.6, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${0.5 * pulse})`;
                    ctx.fill();
                }
            }

            // Tip glow
            const tip = this.segments[this.length - 1];
            const tipPulse = 0.3 + 0.7 * Math.sin(time * 3 + this.phase);
            const tipGrad = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 15);
            tipGrad.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${0.2 * tipPulse})`);
            tipGrad.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
            ctx.fillStyle = tipGrad;
            ctx.fillRect(tip.x - 15, tip.y - 15, 30, 30);
        }
    }

    // Ambient particles that float near tentacles
    class AmbientParticle {
        constructor() {
            this.x = Math.random() * (W || window.innerWidth);
            this.y = Math.random() * (H || window.innerHeight);
            this.size = 0.4 + Math.random() * 0.8;       // Modern, sharp, subtle points
            this.opacity = 0.1 + Math.random() * 0.2;    // Lighter base opacity
            this.baseVx = (Math.random() - 0.5) * 0.2;   // Smoother, slower movement
            this.baseVy = (Math.random() - 0.5) * 0.2;
            this.vx = this.baseVx;
            this.vy = this.baseVy;
            this.ci = Math.floor(Math.random() * TENTACLE_COLORS.length);
            this.phase = Math.random() * Math.PI * 2;
        }
    }

    const tentacles = [];

    function initCanvas() {
        if (!canvas) return;
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;

        tentacles.length = 0;
        for (let i = 0; i < TENTACLE_COUNT; i++) {
            tentacles.push(new Tentacle(i));
        }

        ambientParticles.length = 0;
        for (let i = 0; i < AMBIENT_COUNT; i++) {
            ambientParticles.push(new AmbientParticle());
        }
    }

    function renderCanvas() {
        if (!ctx) { requestAnimationFrame(renderCanvas); return; }

        time += 0.016;

        // Smooth mouse
        targetMX += (mouseX - targetMX) * 0.08;
        targetMY += (mouseY - targetMY) * 0.08;

        ctx.clearRect(0, 0, W, H);

        // 1. BEAUTIFUL NEURON PARTICLES ON ENTIRE BODY (Rendered First)
        ctx.lineWidth = 0.4; // Ultra-fine modern lines
        for (let i = 0; i < ambientParticles.length; i++) {
            const p = ambientParticles[i];
            
            // Mouse Interaction: Connect & Repel
            if (targetMX > 0 && targetMY > 0) {
                const dxm = p.x - targetMX;
                const dym = p.y - targetMY;
                const distToMouseSq = dxm * dxm + dym * dym;
                if (distToMouseSq < 40000) { // ~200px interaction radius
                    const distToMouse = Math.sqrt(distToMouseSq);
                    
                    // Repel particles smoothly
                    if (distToMouse > 0) {
                       const force = (200 - distToMouse) / 200 * 0.08;
                       p.vx += (dxm / distToMouse) * force;
                       p.vy += (dym / distToMouse) * force;
                    }

                    // Draw elegant neural line connecting directly to the mouse cursor
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(targetMX, targetMY);
                    const mouseOp = (1 - distToMouse / 200) * 0.2; // Lighter connection to mouse
                    const c = TENTACLE_COLORS[p.ci];
                    ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${mouseOp})`;
                    ctx.stroke();
                }
            }

            // Restore towards base velocity smoothly (simulates fluid friction)
            p.vx += (p.baseVx - p.vx) * 0.05;
            p.vy += (p.baseVy - p.vy) * 0.05;

            p.phase += 0.005;
            p.x += p.vx + Math.sin(p.phase) * 0.2;
            p.y += p.vy + Math.cos(p.phase * 0.7) * 0.2;
            
            // Wrap around screen
            if (p.x < -20) p.x = W + 20;
            if (p.x > W + 20) p.x = -20;
            if (p.y < -20) p.y = H + 20;
            if (p.y > H + 20) p.y = -20;

            const c = TENTACLE_COLORS[p.ci];
            const pulse = 0.8 + 0.3 * Math.sin(p.phase * 3); // Lighter pulse effect
            
            // Draw central dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${p.opacity * pulse})`;
            ctx.fill();

            // Minimal elegant halo
            if (p.size > 0.9) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${p.opacity * 0.15})`;
                ctx.fill();
            }

            // Neuron connections spanning the entire body
            for (let j = i + 1; j < ambientParticles.length; j++) {
                const p2 = ambientParticles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const distShape = dx * dx + dy * dy;
                // Modern network connection distance (reduced to ~110px radius to save GPU pain)
                if (distShape < 12000) { 
                    const dist = Math.sqrt(distShape);
                    const opacity = (1 - dist / 110) * 0.12; 
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(77, 238, 234, ${opacity})`;
                    ctx.stroke();
                }
            }
        }


        // 2. TENTACLES CONFINED TO "WHAT WE DO" SECTION (#services)
        const servicesSec = document.getElementById('services');
        let tOpacity = 0;
        let cx = W * 0.5;
        let cy = H * 0.55;

        if (servicesSec) {
            const rect = servicesSec.getBoundingClientRect();
            // Origin firmly at the right side of the services section
            cx = rect.right - Math.min(250, rect.width * 0.2); 
            cy = rect.top + rect.height * 0.5;

            // Fade in and out around the section to specifically avoid the banner
            const distFromCenter = Math.abs(cy - H * 0.5);
            // Stays fully visible within the section height + some padding
            const safeZone = rect.height * 0.5 + 200;
            tOpacity = 1 - Math.max(0, distFromCenter - safeZone) / 300;
            tOpacity = Math.max(0, Math.min(1, tOpacity));
        }

        if (tOpacity > 0.01) {
            ctx.globalAlpha = tOpacity;
            const centralPulse = 0.6 + 0.4 * Math.sin(time * 0.8);
            
            // Outer aura
            const centralGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 250);
            centralGrad.addColorStop(0, `rgba(77, 238, 234, ${0.06 * centralPulse})`);
            centralGrad.addColorStop(0.3, `rgba(123, 97, 246, ${0.03 * centralPulse})`);
            centralGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = centralGrad;
            ctx.fillRect(cx - 250, cy - 250, 500, 500);

            // Intense inner core beautifully fusing the origins
            const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
            coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.4 * centralPulse})`);
            coreGrad.addColorStop(0.2, `rgba(77, 238, 234, ${0.3 * centralPulse})`);
            coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = coreGrad;
            ctx.fillRect(cx - 40, cy - 40, 80, 80);

            // Update and draw tentacles bound to the new right-sided origin
            for (const t of tentacles) {
                t.update(time, targetMX, targetMY, scrollRatio, cx, cy);
                t.draw(ctx, time);
            }

            // Draw connections between nearby tentacle tips (neural web)
            ctx.lineWidth = 0.3;
            for (let i = 0; i < tentacles.length; i++) {
                for (let j = i + 1; j < tentacles.length; j++) {
                    const tipA = tentacles[i].segments[tentacles[i].length - 1];
                    const tipB = tentacles[j].segments[tentacles[j].length - 1];
                    const dx = tipA.x - tipB.x;
                    const dy = tipA.y - tipB.y;
                    const d = Math.sqrt(dx * dx + dy * dy);

                    if (d < 200) {
                        const opacity = (1 - d / 200) * 0.06;
                        const c = TENTACLE_COLORS[i % TENTACLE_COLORS.length];
                        ctx.beginPath();
                        ctx.moveTo(tipA.x, tipA.y);
                        ctx.lineTo(tipB.x, tipB.y);
                        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${opacity})`;
                        ctx.stroke();
                    }
                }
            }

            // Connect mid-segments between adjacent tentacles
            for (let i = 0; i < tentacles.length; i++) {
                const next = tentacles[(i + 1) % tentacles.length];
                for (let s = 15; s < tentacles[i].length; s += 20) {
                    const segA = tentacles[i].segments[s];
                    const segB = next.segments[Math.min(s, next.length - 1)];
                    const dx = segA.x - segB.x;
                    const dy = segA.y - segB.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 150) {
                        const opacity = (1 - d / 150) * 0.03;
                        ctx.beginPath();
                        ctx.moveTo(segA.x, segA.y);
                        ctx.lineTo(segB.x, segB.y);
                        ctx.strokeStyle = `rgba(77,238,234,${opacity})`;
                        ctx.lineWidth = 0.2;
                        ctx.stroke();
                    }
                }
            }

            // Reset opacity so full-screen effects aren't faded
            ctx.globalAlpha = 1;
        }

        requestAnimationFrame(renderCanvas);
    }

    window.addEventListener('resize', initCanvas);
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    document.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });
    initCanvas();
    requestAnimationFrame(renderCanvas);


    // ─────────────────────────────────────────────────────
    // 2. SMOOTH SCROLL (Robust lerp transform)
    // ─────────────────────────────────────────────────────
    const scroller = document.getElementById('scroll-container');
    let target = 0;
    let current = 0;
    let maxScroll = 0;
    const LERP_SPEED = 0.075;

    function calcHeight() {
        if (!scroller) return;
        maxScroll = scroller.scrollHeight - window.innerHeight;
        if (maxScroll < 0) maxScroll = 0;
    }

    window.addEventListener('wheel', e => {
        e.preventDefault();
        target += e.deltaY;
        target = Math.max(0, Math.min(target, maxScroll));
    }, { passive: false });

    let ty = 0;
    window.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchmove', e => {
        e.preventDefault();
        const dy = ty - e.touches[0].clientY;
        ty = e.touches[0].clientY;
        target += dy * 1.8;
        target = Math.max(0, Math.min(target, maxScroll));
    }, { passive: false });

    const navEl = document.querySelector('nav');
    function tick() {
        current += (target - current) * LERP_SPEED;
        if (scroller) scroller.style.transform = `translate3d(0, ${-current}px, 0)`;
        scrollRatio = maxScroll > 0 ? current / maxScroll : 0;
        currentScroll = current;
        if (navEl) {
            if (current > 50) {
                navEl.classList.add('scrolled');
                navEl.style.backgroundColor = 'rgba(5, 5, 7, 0.95)';
                navEl.style.backdropFilter = 'blur(10px)';
                navEl.style.webkitBackdropFilter = 'blur(10px)';
                navEl.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                navEl.style.height = '80px';
            } else {
                navEl.classList.remove('scrolled');
                navEl.style.backgroundColor = 'transparent';
                navEl.style.backdropFilter = 'none';
                navEl.style.webkitBackdropFilter = 'none';
                navEl.style.borderBottom = 'none';
                navEl.style.height = '100px';
            }
        }
        updateScrollbar();
        doParallax();
        doReveals();
        doCounters();
        requestAnimationFrame(tick);
    }

    window.addEventListener('load', () => {
        setTimeout(() => { calcHeight(); doReveals(); }, 300);
    });
    window.addEventListener('resize', calcHeight);
    calcHeight();
    requestAnimationFrame(tick);


    // ─────────────────────────────────────────────────────
    // 3. SCROLLBAR
    // ─────────────────────────────────────────────────────
    const thumb = document.getElementById('scrollbar-thumb');
    let sbTimeout;
    function updateScrollbar() {
        if (!thumb || maxScroll <= 0) return;
        const frac = window.innerHeight / (maxScroll + window.innerHeight);
        const h = Math.max(frac * window.innerHeight, 30);
        const t = (current / maxScroll) * (window.innerHeight - h);
        thumb.style.height = h + 'px';
        thumb.style.transform = `translateY(${t}px)`;
        thumb.classList.add('active');
        clearTimeout(sbTimeout);
        sbTimeout = setTimeout(() => thumb.classList.remove('active'), 2000);
    }


    // ─────────────────────────────────────────────────────
    // 4. CUSTOM CURSOR
    // ─────────────────────────────────────────────────────
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    let cx = 0, cy = 0, rx = 0, ry = 0;

    function cursorLoop() {
        if (dot) { dot.style.left = cx + 'px'; dot.style.top = cy + 'px'; }
        rx += (cx - rx) * 0.12;
        ry += (cy - ry) * 0.12;
        if (ring) { ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; }
        requestAnimationFrame(cursorLoop);
    }

    document.addEventListener('mousemove', e => { cx = e.clientX; cy = e.clientY; });
    document.querySelectorAll('a, button, [data-cursor]').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
    if (dot) requestAnimationFrame(cursorLoop);


    // ─────────────────────────────────────────────────────
    // 5. SCROLL REVEALS
    // ─────────────────────────────────────────────────────
    const reveals = document.querySelectorAll('.fade-up, .fade-in, .scale-in');

    function doReveals() {
        const triggerY = window.innerHeight * 0.87;
        reveals.forEach(el => {
            if (el.classList.contains('visible')) return;
            const rect = el.getBoundingClientRect();
            if (rect.top < triggerY) el.classList.add('visible');
        });
    }


    // ─────────────────────────────────────────────────────
    // 6. COUNTER ANIMATION
    // ─────────────────────────────────────────────────────
    const counters = document.querySelectorAll('[data-count]');
    const counted = new Set();

    function doCounters() {
        counters.forEach(el => {
            if (counted.has(el)) return;
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.85) {
                counted.add(el);
                runCounter(el);
            }
        });
    }

    function runCounter(el) {
        const tgt = parseFloat(el.dataset.count);
        const unitSpan = el.querySelector('.unit');
        const unit = unitSpan ? unitSpan.textContent : '';
        const isFloat = tgt % 1 !== 0;
        const dur = 2500;
        const start = performance.now();
        function frame(now) {
            const p = Math.min((now - start) / dur, 1);
            const e = 1 - Math.pow(1 - p, 4);
            const v = e * tgt;
            el.innerHTML = (isFloat ? v.toFixed(1) : Math.floor(v)) +
                (unit ? ` <span class="unit">${unit}</span>` : '');
            if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }


    // ─────────────────────────────────────────────────────
    // 7. PARALLAX
    // ─────────────────────────────────────────────────────
    function doParallax() {
        const hero = document.getElementById('hero');
        if (hero) {
            const heroContent = hero.querySelector('.hero-content');
            const scrollCue = hero.querySelector('.scroll-cue');
            if (heroContent) {
                const p = Math.min(current / window.innerHeight, 1);
                heroContent.style.transform = `translateY(${p * 80}px) scale(${1 - p * 0.08})`;
                heroContent.style.opacity = 1 - p * 1.3;
            }
            if (scrollCue) scrollCue.style.opacity = Math.max(0, 1 - current / 200);
        }

        document.querySelectorAll('.display-lg, .display-xl').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
                el.style.transform = `translateY(${(0.5 - progress) * -25}px)`;
            }
        });
    }


    // ─────────────────────────────────────────────────────
    // 8. MAGNETIC HOVER ON CARDS
    // ─────────────────────────────────────────────────────
    document.querySelectorAll('.service-cell, .metric-card, .sector-cell, .pillar').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const cxc = rect.width / 2;
            const cyc = rect.height / 2;
            const dx = (x - cxc) / cxc;
            const dy = (y - cyc) / cyc;
            card.style.transform = `perspective(600px) rotateX(${dy * -3}deg) rotateY(${dx * 3}deg) scale(1.02)`;
            card.style.setProperty('--glow-x', x + 'px');
            card.style.setProperty('--glow-y', y + 'px');
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });


    // ─────────────────────────────────────────────────────
    // 9. SMOOTH ANCHOR SCROLL
    // ─────────────────────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const id = a.getAttribute('href');
            if (id === '#') return;
            const el = document.querySelector(id);
            if (el) {
                e.preventDefault();
                const rect = el.getBoundingClientRect();
                target = Math.max(0, Math.min(current + rect.top, maxScroll));
            }
        });
    });


    // ─────────────────────────────────────────────────────
    // 10. MOBILE MENU
    // ─────────────────────────────────────────────────────
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileOverlay = document.getElementById('mobile-overlay');
    if (mobileToggle && mobileOverlay) {
        mobileToggle.addEventListener('click', () => {
            const open = mobileOverlay.classList.toggle('open');
            mobileToggle.innerHTML = open ? '<i class="ph ph-x"></i>' : '<i class="ph ph-list"></i>';
            document.body.style.overflow = open ? 'hidden' : '';
            if (!open) {
                mobileOverlay.querySelectorAll('.mob-accordion').forEach(a => a.classList.remove('open'));
            }
        });
        document.querySelectorAll('[data-mobile-link]').forEach(link => {
            link.addEventListener('click', () => {
                mobileOverlay.classList.remove('open');
                mobileToggle.innerHTML = '<i class="ph ph-list"></i>';
                document.body.style.overflow = '';
            });
        });
        mobileOverlay.querySelectorAll('.mob-accordion-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const acc = btn.parentElement;
                const wasOpen = acc.classList.contains('open');
                // close all accordions first
                mobileOverlay.querySelectorAll('.mob-accordion').forEach(a => a.classList.remove('open'));
                if (!wasOpen) acc.classList.add('open');
                btn.setAttribute('aria-expanded', !wasOpen);
            });
        });
    }


    // ─────────────────────────────────────────────────────
    // 11. TERMINAL
    // ─────────────────────────────────────────────────────
    const tInput = document.getElementById('term-input');
    const tBtn = document.getElementById('term-submit');
    const tBody = document.getElementById('term-body');

    function tLog(msg, cls, cb) {
        if (!tBody) return;
        const p = document.createElement('p');
        p.className = `t-log ${cls}`;
        p.textContent = '';
        tBody.appendChild(p);
        let i = 0;
        const spd = cls === 'usr' ? 4 : 16;
        (function type() {
            if (i < msg.length) { p.textContent += msg.charAt(i++); tBody.scrollTop = tBody.scrollHeight; setTimeout(type, spd); }
            else if (cb) cb();
        })();
    }

    function submitTerm() {
        if (!tInput) return;
        const v = tInput.value.trim();
        if (!v) return;
        tInput.value = '';
        tInput.disabled = true;
        if (tBtn) tBtn.disabled = true;
        const p = document.createElement('p');
        p.className = 't-log usr';
        p.textContent = `> ${v}`;
        tBody.appendChild(p);
        tBody.scrollTop = tBody.scrollHeight;
        setTimeout(() => {
            tLog('[sys] Analyzing transmission...', 'sys', () => {
                setTimeout(() => {
                    const res = [
                        "[sys] Intent registered. Constructing autonomous deployment path.",
                        "[sys] Request acknowledged. Agentic swarm reallocating resources.",
                        "[sys] Data integrated. Operations will self-optimize shortly.",
                        "[sys] Sequence initiated. Stand by for swarm consensus.",
                    ];
                    tLog(res[Math.floor(Math.random() * res.length)], 'res', () => {
                        setTimeout(() => {
                            tLog('[sys] Lifecycle complete. Awaiting next command.', 'sys', () => {
                                setTimeout(() => {
                                    if (tInput) { tInput.disabled = false; tInput.focus(); }
                                    if (tBtn) tBtn.disabled = false;
                                }, 400);
                            });
                        }, 900);
                    });
                }, 600);
            });
        }, 250);
    }

    if (tBtn) tBtn.addEventListener('click', submitTerm);
    if (tInput) tInput.addEventListener('keypress', e => { if (e.key === 'Enter') submitTerm(); });


    // ─────────────────────────────────────────────────────
    // 12. CYBER-TERMINAL PRELOADER (GSAP)
    // ─────────────────────────────────────────────────────

    // Text Scramble (reused for hero title after preloader)
    class TextScramble {
        constructor(el) {
            this.el = el;
            this.chars = '!<>-_\\/[]{}—=+*^?#________';
            this.frame = 0;
            this.queue = [];
            this.resolve = null;
        }
        setText(newText) {
            const oldText = this.el.innerText;
            const length = Math.max(oldText.length, newText.length);
            return new Promise(resolve => {
                this.resolve = resolve;
                this.queue = [];
                for (let i = 0; i < length; i++) {
                    const from = oldText[i] || '';
                    const to = newText[i] || '';
                    const start = Math.floor(Math.random() * 20);
                    const end = start + Math.floor(Math.random() * 25);
                    this.queue.push({ from, to, start, end });
                }
                cancelAnimationFrame(this.frameRequest);
                this.frame = 0;
                this.update();
            });
        }
        update() {
            let output = '', complete = 0;
            for (let i = 0; i < this.queue.length; i++) {
                let { from, to, start, end, char } = this.queue[i];
                if (this.frame >= end) {
                    complete++;
                    output += to;
                } else if (this.frame >= start) {
                    if (!char || Math.random() < 0.28) {
                        char = this.chars[Math.floor(Math.random() * this.chars.length)];
                        this.queue[i].char = char;
                    }
                    output += `<span class="scramble-char">${char}</span>`;
                } else {
                    output += from;
                }
            }
            this.el.innerHTML = output;
            if (complete === this.queue.length) {
                if (this.resolve) this.resolve();
            } else {
                this.frameRequest = requestAnimationFrame(() => this.update());
                this.frame++;
            }
        }
    }

    const heroTitle = document.querySelector('.hero-title');
    let originalTitleHTML = '';
    let originalTitleText = '';
    if (heroTitle) {
        originalTitleHTML = heroTitle.innerHTML;
        originalTitleText = heroTitle.textContent;
    }

    // ── Wait for GSAP to load, then run preloader ──
    function waitForGSAP(cb) {
        if (typeof gsap !== 'undefined') return cb();
        const check = setInterval(() => {
            if (typeof gsap !== 'undefined') { clearInterval(check); cb(); }
        }, 50);
    }

    waitForGSAP(() => {
        const preloader = document.getElementById('cyber-preloader');
        const termLines = document.getElementById('term-lines');
        const termLogo = document.getElementById('term-logo');
        const termErrorBlock = document.getElementById('term-error-block');
        const termPunchline = document.getElementById('term-punchline');
        const termCursor = document.getElementById('term-cursor');
        const soundToggle = document.getElementById('sound-toggle');
        const soundIcon = document.getElementById('sound-icon');

        if (!preloader) return;

        // ── Cache check: skip preloader if already seen this session ──
        if (sessionStorage.getItem('pureai_preloader_seen')) {
            preloader.remove();
            if (heroTitle) heroTitle.innerHTML = originalTitleHTML;
            // Trigger reveals immediately
            setTimeout(() => {
                document.querySelectorAll('.fade-up, .fade-in, .scale-in').forEach(el => el.classList.add('visible'));
            }, 100);
            return;
        }

        let assetsReady = false;
        let sequenceDone = false;

        window.addEventListener('load', () => { assetsReady = true; });

                // ── Audio: Low-Frequency Data Hum ──
        let audioCtx = null;
        let oscillator = null;
        let gainNode = null;
        let isMuted = true; // Start muted by default

        function getAudioCtx() {
            if (!audioCtx) {
                try {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {}
            }
            return audioCtx;
        }

        function startHum() {
            try {
                const ctx = getAudioCtx();
                if (!ctx) return;
                oscillator = ctx.createOscillator();
                gainNode = ctx.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(55, ctx.currentTime);
                gainNode.gain.setValueAtTime(isMuted ? 0 : 0.04, ctx.currentTime);

                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                lfo.frequency.setValueAtTime(0.5, ctx.currentTime);
                lfoGain.gain.setValueAtTime(8, ctx.currentTime);
                lfo.connect(lfoGain);
                lfoGain.connect(oscillator.frequency);
                lfo.start();

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                oscillator.start();
            } catch (e) {}
        }

        function stopHum() {
            if (gainNode && audioCtx) {
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3);
                setTimeout(() => {
                    if (oscillator) try { oscillator.stop(); } catch(e) {}
                }, 400);
            }
        }

        // ── Cyber Typing Click Sound ──
        function playTypeClick() {
            if (isMuted) return;
            try {
                const ctx = getAudioCtx();
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(1800 + Math.random() * 800, ctx.currentTime);
                g.gain.setValueAtTime(0.03, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.05);
            } catch (e) {}
        }

        // ── Glitch buzz sound ──
        function playGlitchBuzz() {
            if (isMuted) return;
            try {
                const ctx = getAudioCtx();
                if (!ctx) return;
                const bufferSize = ctx.sampleRate * 0.15;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
                const src = ctx.createBufferSource();
                const g = ctx.createGain();
                src.buffer = buffer;
                g.gain.setValueAtTime(0.06, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
                src.connect(g);
                g.connect(ctx.destination);
                src.start();
            } catch (e) {}
        }

        function toggleMute() {
            isMuted = !isMuted;
            if (soundIcon) soundIcon.innerHTML = isMuted ? '<i class="ph ph-speaker-slash"></i>' : '<i class="ph ph-speaker-high"></i>';
            if (gainNode && audioCtx) {
                gainNode.gain.setValueAtTime(isMuted ? 0 : 0.04, audioCtx.currentTime);
            }
            if (!isMuted && !audioCtx) startHum();
        }

        if (soundToggle) {
            soundToggle.addEventListener('click', toggleMute);
            soundIcon.innerHTML = '<i class="ph ph-speaker-slash"></i>';
            gsap.to(soundToggle, { opacity: 1, duration: 0.3, delay: 0.3 });
        }

        // ── Typewriter Helper (with click sounds) ──
        function typewrite(el, text, speed = 30) {
            return new Promise(resolve => {
                let i = 0;
                el.textContent = '';
                el.style.opacity = 1;
                const interval = setInterval(() => {
                    el.textContent += text.charAt(i);
                    playTypeClick();
                    i++;
                    if (i >= text.length) {
                        clearInterval(interval);
                        resolve();
                    }
                }, speed);
            });
        }

        // ── HTML-Tag-Aware Typewriter Helper ──
        function typewriteHTML(el, htmlString, speed = 40) {
            return new Promise(resolve => {
                el.innerHTML = '';
                el.style.opacity = '1';
                const tokens = [];
                let i = 0;
                while (i < htmlString.length) {
                    if (htmlString[i] === '<') {
                        const end = htmlString.indexOf('>', i);
                        if (end !== -1) {
                            tokens.push({ type: 'tag', content: htmlString.slice(i, end + 1) });
                            i = end + 1;
                            continue;
                        }
                    }
                    tokens.push({ type: 'char', content: htmlString[i] });
                    i++;
                }
                
                let tokenIndex = 0;
                const interval = setInterval(() => {
                    if (tokenIndex >= tokens.length) {
                        clearInterval(interval);
                        resolve();
                        return;
                    }
                    
                    let currentToken = tokens[tokenIndex];
                    while (currentToken && currentToken.type === 'tag') {
                        el.innerHTML += currentToken.content;
                        tokenIndex++;
                        currentToken = tokens[tokenIndex];
                    }
                    
                    if (currentToken && currentToken.type === 'char') {
                        el.innerHTML += currentToken.content;
                        playTypeClick();
                        tokenIndex++;
                    }
                }, speed);
            });
        }

        function addLine(container, text, className = '') {
            const div = document.createElement('div');
            div.className = `term-line ${className}`;
            const span = document.createElement('span');
            span.className = 'typed-text';
            div.appendChild(span);
            container.appendChild(div);
            return { div, span };
        }

        // ── GSAP MASTER TIMELINE (HALF SPEED) ──
        const tl = gsap.timeline({ delay: 0.2 });

        // ════════════════════════
        // PHASE 1: Logo Reveal
        // ════════════════════════
        tl.to(termCursor, { opacity: 1, duration: 0.01 })
          .to(termLogo, {
              opacity: 1,
              scale: 1,
              duration: 0.6,
              ease: 'back.out(1.2)',
              onStart: () => startHum()
          })
          .to('.term-logo-glow', { opacity: 1, duration: 0.4 }, '-=0.3')
          .add(() => {
              const img = document.querySelector('.term-logo-img');
              if (img) img.classList.add('glow');
          }, '-=0.2')
          .to({}, { duration: 0.2 }); // Hold

        // Boot Lines (removed per request)

        // ════════════════════════
        // PHASE 3: Error + Flex
        // ════════════════════════

        // Screen flash
        tl.add(() => {
            playGlitchBuzz();
            const flash = document.createElement('div');
            flash.className = 'screen-flash';
            preloader.appendChild(flash);
            gsap.to(flash, { opacity: 1, duration: 0.04, yoyo: true, repeat: 3, onComplete: () => flash.remove() });
        });

        // Glitch the whole terminal
        tl.add(() => {
            const content = document.getElementById('terminal-content');
            if (content) content.classList.add('glitch-active');
            setTimeout(() => content?.classList.remove('glitch-active'), 300);
        });

        // Clear everything
        tl.add(() => {
            gsap.to([termLines, termLogo, '.term-logo-glow'], {
                opacity: 0, duration: 0.25, ease: 'power2.in',
                onComplete: () => {
                    if (termLogo) termLogo.style.display = 'none';
                    if (termLines) termLines.style.display = 'none';
                }
            });
            gsap.to('.term-error', { opacity: 0, duration: 0.2, onComplete: () => {
                const err = document.querySelector('.term-error');
                if (err) err.style.display = 'none';
            }});
        });
        tl.to({}, { duration: 0.3 });

        // Spawn floating particles
        tl.add(() => {
            for (let i = 0; i < 15; i++) {
                const p = document.createElement('div');
                p.className = 'term-particle';
                p.style.left = Math.random() * 100 + '%';
                p.style.top = Math.random() * 100 + '%';
                p.style.width = (2 + Math.random() * 3) + 'px';
                p.style.height = p.style.width;
                p.style.opacity = '0';
                preloader.appendChild(p);
                gsap.to(p, {
                    opacity: 0.3 + Math.random() * 0.4,
                    y: -(20 + Math.random() * 60),
                    x: (Math.random() - 0.5) * 50,
                    duration: 1.5 + Math.random() * 2,
                    ease: 'power1.out',
                    delay: Math.random() * 0.4,
                    repeat: -1,
                    yoyo: true
                });
            }
        });

        // Reality line — scramble reveal
        tl.add(() => {
            const reality = document.createElement('div');
            reality.className = 'term-reality';
            reality.style.opacity = '1';
            termPunchline.appendChild(reality);
            const plainText = 'We are just 10 but we manage 300,000 bots.';
            const fullHTML = 'We are just <span class="bot-count">10</span> but we manage <span class="bot-count">300,000</span> bots.';
            const fx = new TextScramble(reality);
            fx.setText(plainText).then(() => {
                reality.innerHTML = fullHTML;
            });
        });
        tl.to({}, { duration: 3.5 }); // 2s typing duration + 1.5s hold before exit

        // ════════════════════════
        // EXIT: Wait for assets + reveal
        // ════════════════════════
        tl.add(() => {
            sequenceDone = true;
            attemptExit();
        });

        function attemptExit() {
            // Eliminated load waiting to speed up experience immediately
            exitPreloader();
        }

        function exitPreloader() {
            gsap.to(termCursor, { opacity: 0, duration: 0.2 });
            stopHum();

            // Fire exit without additional delays
            preloader.classList.add('exit');
            sessionStorage.setItem('pureai_preloader_seen', '1');
            startAmbientMusic();
            showSiteToggle();

            if (heroTitle) {
                setTimeout(() => {
                    const fx = new TextScramble(heroTitle);
                    heroTitle.style.whiteSpace = 'pre-line';
                    const textLines = "Built by AI.\nFor AI.";
                    heroTitle.innerHTML = '';
                    fx.setText(textLines).then(() => {
                        heroTitle.style.whiteSpace = '';
                        heroTitle.innerHTML = originalTitleHTML;
                    });
                }, 400); // Wait for shutter reveal to finish
            }
            setTimeout(() => preloader.remove(), 800);
        }

        // ── Ambient Cyber Music (plays on entire site) ──
        let ambientCtx = null;
        let ambientNodes = [];

        function startAmbientMusic() {
            if (isMuted || ambientCtx) return;
            try {
                ambientCtx = new (window.AudioContext || window.webkitAudioContext)();
                const masterGain = ambientCtx.createGain();
                masterGain.gain.setValueAtTime(0, ambientCtx.currentTime);
                masterGain.gain.linearRampToValueAtTime(0.025, ambientCtx.currentTime + 3);
                masterGain.connect(ambientCtx.destination);

                // Layer 1: Warm drone pad (A2 = 110Hz)
                const drone1 = ambientCtx.createOscillator();
                const drone1Gain = ambientCtx.createGain();
                drone1.type = 'sine';
                drone1.frequency.setValueAtTime(110, ambientCtx.currentTime);
                drone1Gain.gain.setValueAtTime(0.4, ambientCtx.currentTime);
                drone1.connect(drone1Gain);
                drone1Gain.connect(masterGain);
                drone1.start();

                // Layer 2: Fifth harmony (E3 = 165Hz)
                const drone2 = ambientCtx.createOscillator();
                const drone2Gain = ambientCtx.createGain();
                drone2.type = 'sine';
                drone2.frequency.setValueAtTime(164.81, ambientCtx.currentTime);
                drone2Gain.gain.setValueAtTime(0.2, ambientCtx.currentTime);
                drone2.connect(drone2Gain);
                drone2Gain.connect(masterGain);
                drone2.start();

                // Layer 3: High shimmer (A5 = 880Hz with slow LFO)
                const shimmer = ambientCtx.createOscillator();
                const shimmerGain = ambientCtx.createGain();
                const shimmerLFO = ambientCtx.createOscillator();
                const shimmerLFOGain = ambientCtx.createGain();
                shimmer.type = 'sine';
                shimmer.frequency.setValueAtTime(880, ambientCtx.currentTime);
                shimmerGain.gain.setValueAtTime(0.03, ambientCtx.currentTime);
                shimmerLFO.frequency.setValueAtTime(0.15, ambientCtx.currentTime);
                shimmerLFOGain.gain.setValueAtTime(0.02, ambientCtx.currentTime);
                shimmerLFO.connect(shimmerLFOGain);
                shimmerLFOGain.connect(shimmerGain.gain);
                shimmer.connect(shimmerGain);
                shimmerGain.connect(masterGain);
                shimmer.start();
                shimmerLFO.start();

                // Layer 4: Sub bass (55Hz)
                const sub = ambientCtx.createOscillator();
                const subGain = ambientCtx.createGain();
                sub.type = 'sine';
                sub.frequency.setValueAtTime(55, ambientCtx.currentTime);
                subGain.gain.setValueAtTime(0.3, ambientCtx.currentTime);
                sub.connect(subGain);
                subGain.connect(masterGain);
                sub.start();

                // Slow pitch drift on drone for organic feel
                const driftLFO = ambientCtx.createOscillator();
                const driftGain = ambientCtx.createGain();
                driftLFO.frequency.setValueAtTime(0.08, ambientCtx.currentTime);
                driftGain.gain.setValueAtTime(2, ambientCtx.currentTime);
                driftLFO.connect(driftGain);
                driftGain.connect(drone1.frequency);
                driftLFO.start();

                ambientNodes = [drone1, drone2, shimmer, sub, shimmerLFO, driftLFO];

                // Store masterGain for mute toggling
                window._ambientMasterGain = masterGain;
                window._ambientCtx = ambientCtx;
            } catch (e) {}
        }

        // Override toggle to also control ambient music
        const origToggle = toggleMute;
        soundToggle?.removeEventListener('click', origToggle);

        const siteSoundToggle = document.getElementById('site-sound-toggle');
        const siteSoundIcon = document.getElementById('site-sound-icon');

        function handleMuteToggle() {
            isMuted = !isMuted;
            const icon = isMuted ? '<i class="ph ph-speaker-slash"></i>' : '<i class="ph ph-speaker-high"></i>';
            if (soundIcon) soundIcon.innerHTML = icon;
            if (siteSoundIcon) siteSoundIcon.innerHTML = icon;
            if (gainNode && audioCtx) {
                gainNode.gain.setValueAtTime(isMuted ? 0 : 0.04, audioCtx.currentTime);
            }
            // Control ambient music
            if (window._ambientMasterGain && window._ambientCtx) {
                window._ambientMasterGain.gain.linearRampToValueAtTime(
                    isMuted ? 0 : 0.025,
                    window._ambientCtx.currentTime + 0.5
                );
            }
            if (!isMuted && !ambientCtx) startAmbientMusic();
        }

        soundToggle?.addEventListener('click', handleMuteToggle);
        siteSoundToggle?.addEventListener('click', handleMuteToggle);

        // Show site toggle when preloader is gone
        function showSiteToggle() {
            if (siteSoundToggle) siteSoundToggle.classList.add('visible');
        }

        // Emergency timeout
        setTimeout(() => {
            if (!preloader.classList.contains('exit')) {
                sequenceDone = true;
                assetsReady = true;
                attemptExit();
            }
        }, 15000);
    });


    // ─────────────────────────────────────────────────────
    // 13. KEYBOARD NAVIGATION
    // ─────────────────────────────────────────────────────
    document.addEventListener('keydown', e => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return; // Don't hijack typing
        if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); target = Math.min(target + 300, maxScroll); }
        if (e.key === 'ArrowUp') { e.preventDefault(); target = Math.max(target - 300, 0); }
        if (e.key === 'Home') { e.preventDefault(); target = 0; }
        if (e.key === 'End') { e.preventDefault(); target = maxScroll; }
    });


    // ─────────────────────────────────────────────────────
    // 14. HERO TILT ON MOUSE
    // ─────────────────────────────────────────────────────
    const heroSection = document.getElementById('hero');
    if (heroSection) {
        heroSection.addEventListener('mousemove', e => {
            if (current > window.innerHeight * 0.3) return;
            const rect = heroSection.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            const content = heroSection.querySelector('.hero-content');
            if (content) {
                content.style.transform = `perspective(1000px) rotateY(${x * 2}deg) rotateX(${-y * 2}deg)`;
            }
        });
        heroSection.addEventListener('mouseleave', () => {
            const content = heroSection.querySelector('.hero-content');
            if (content) content.style.transform = '';
        });
    }

    // ─────────────────────────────────────────────────────
    // 15. AI INLINE SECTION (After Hero — Claude-inspired)
    // ─────────────────────────────────────────────────────
    const aiInput = document.getElementById('ai-section-input');
    const aiSend = document.getElementById('ai-section-send');
    const aiResponse = document.getElementById('ai-section-response');
    const aiPills = document.querySelectorAll('.ai-pill');

    // Context data for the AI system prompt
    const WEBSITE_CONTEXT = `
    You are the official AI Assistant for "Pure AI".
    Pure AI is an autonomous intelligence network — Built by AI, For AI. We drive operations globally through intelligent automation, predictive analytics, physical robots, and digital agents.
    
    Products: We have two main products. Physical Robots (high-DoF machines for manufacturing/logistics) and Intelligent Bots (digital workers replacing tasks). Both connected via Swarm Deployment.
    Services (6 pillars): Agentic AI Systems, Autonomous Operations, Predictive Intelligence, Digital Workforce, AI Infrastructure, and Real-Time Decisions.
    Platform: Runs on proprietary silicon with 30 PF peak compute, <4ms latency, 400 Gb/s InfiniBand. Features Self-Healing Mesh, Agentic Core, LLM-Agnostic inference, liquid cooling, and sovereign encryption.
    Solutions: Enterprise Automation (99.9% friction reduction), Operations Optimization (40% asset utilization gain), Decision Intelligence (real-time accuracy), Customer Support (24/7 global coverage), Autonomous Workflows (90% workforce reduction).
    Industries: Banking, Healthcare, Logistics, Manufacturing, Agriculture, Airlines, Education, Retail, Corporation, Infrastructure.
    Innovation Philosophy: Intelligence as a Design Principle. We don't add AI to products, we design systems to think from the start.
    Contact/Demo: Users should scroll down to the Contact section terminal. Routing takes 11ms via swarm consensus.
    
    Answer the user's questions based ONLY on this information. Keep answers extremely concise, confident, and sci-fi oriented, just like the website tone. Output plain text, maximum 2-3 short sentences. Do NOT output any internal thoughts, <think> tags, or reasoning steps.
    `;

    // We'll store chat history here
    let chatHistory = [];

    // ───────── Message-limit (Disabled) ─────────
    const AIL_MAX = 999999;
    const AIL_KEY = 'pureai_ai_msg_count_v2';
    // Clear any counters to reset state.
    try { 
        localStorage.removeItem('pureai_ai_msg_count_v1');
        localStorage.removeItem(AIL_KEY);
    } catch (_) {}
    let userMsgCount = 0;
    let ailMounted = false;

    // Dev helper: append ?resetai to URL to clear the counter instantly.
    if (/[?&]resetai\b/.test(location.search)) {
        try { localStorage.removeItem(AIL_KEY); } catch (_) {}
        userMsgCount = 0;
    }

    function ailEnsureMounted() {
        if (ailMounted) return;
        ailMounted = true;

        const modal = document.createElement('div');
        modal.className = 'ail-modal';
        modal.id = 'ail-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'ail-title');
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="ail-backdrop" data-ail-close></div>
            <div class="ail-card">
                <button class="ail-close" type="button" data-ail-close aria-label="Close">
                    <i class="ph ph-x"></i>
                </button>

                <div class="ail-head">
                    <span class="ail-chip">
                        <span class="ail-chip-dot"></span>
                        Personalized assistance
                    </span>
                    <h2 class="ail-title" id="ail-title">Let's take this further</h2>
                    <p class="ail-subtitle">It seems you're interested in Pure AI. We'd be happy to discuss it in detail. Please share your contact details and your query below.</p>
                </div>

                <form class="ail-form" id="ail-form">
                    <div class="ail-row">
                        <div class="ail-field">
                            <label class="ail-field-label" for="ail-name">Full Name *</label>
                            <input class="ail-input" type="text" id="ail-name" maxlength="160" name="name" placeholder="Your full name" required>
                        </div>
                        <div class="ail-field">
                            <label class="ail-field-label" for="ail-email">Email *</label>
                            <input class="ail-input" type="email" id="ail-email" maxlength="254" name="email" placeholder="you@company.com" required>
                        </div>
                    </div>

                    <div class="ail-field">
                        <label class="ail-field-label" for="ail-phone">Phone (optional)</label>
                        <input class="ail-input" type="tel" id="ail-phone" maxlength="40" name="phone" placeholder="+1 (555) 000-0000">
                    </div>

                    <div class="ail-field">
                        <label class="ail-field-label" for="ail-query">Your query *</label>
                        <textarea class="ail-textarea" id="ail-query" maxlength="5000" name="query" rows="4" placeholder="Tell us a bit more about what you'd like to explore..." required></textarea>
                    </div>

                    <button class="ail-submit" type="submit" id="ail-submit">
                        <span>Talk to Pure AI</span>
                        <i class="ph ph-paper-plane-tilt"></i>
                    </button>

                    <p class="ail-footer-hint">
                        <i class="ph ph-shield-check"></i>
                        Please do not include passwords, identity documents or payment details.
                    </p>
                </form>

                <div class="ail-success" id="ail-success">
                    <div class="ail-check"><i class="ph-bold ph-check"></i></div>
                    <h3 class="ail-success-title">Transmission received</h3>
                    <p class="ail-success-sub">Thank you <span id="ail-success-name">there</span>. Response times vary.</p>
                    <button class="ail-success-close" type="button" data-ail-close>Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close handlers
        modal.querySelectorAll('[data-ail-close]').forEach(el => {
            el.addEventListener('click', ailCloseModal);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) ailCloseModal();
        });

        const form = modal.querySelector('#ail-form');
        pureaiBindInquiry(form, 'ai-interest', () => ({
            name: form.querySelector('#ail-name').value.trim(),
            email: form.querySelector('#ail-email').value.trim(),
            phone: form.querySelector('#ail-phone').value.trim(),
            message: form.querySelector('#ail-query').value.trim()
        }), result => {
            form.style.display = 'none';
            modal.querySelector('#ail-success-name').textContent = form.querySelector('#ail-name').value.trim().split(' ')[0] || 'there';
            const success = modal.querySelector('#ail-success');
            success.classList.add('is-visible');
            success.setAttribute('role', 'status');
            success.setAttribute('tabindex', '-1');
            success.querySelector('.ail-success-title').textContent = 'Inquiry accepted for delivery';
            success.querySelector('.ail-success-sub').textContent = 'Thank you. Your inquiry has been accepted for delivery. Response times vary. Reference: ' + result.reference;
            success.focus();
        });
    }

    function ailOpenModal() {
        ailEnsureMounted();
        const modal = document.getElementById('ail-modal');
        if (!modal) return;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('ail-locked');
        // Focus first field for accessibility
        setTimeout(() => {
            const first = modal.querySelector('#ail-name');
            if (first && !modal.querySelector('#ail-success.is-visible')) first.focus();
        }, 250);
    }

    function ailCloseModal() {
        const modal = document.getElementById('ail-modal');
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('ail-locked');
    }

    // Expose to window for automated testing purposes
    window.ailOpenModal = ailOpenModal;

    function ailShowBanner() {
        const card = document.querySelector('.ai-section-card');
        if (!card || card.querySelector('.ail-banner')) return;

        const box = card.querySelector('.ai-section-inputbox');
        if (box) box.style.display = 'none';

        const banner = document.createElement('button');
        banner.type = 'button';
        banner.className = 'ail-banner';
        banner.setAttribute('aria-label', 'Continue the conversation with our team');
        banner.innerHTML = `
            <span class="ail-banner-icon"><i class="ph-fill ph-chat-teardrop-dots"></i></span>
            <span class="ail-banner-text">
                <span class="ail-banner-title">You've reached the free chat limit</span>
                <span class="ail-banner-sub">Share your details and our team will continue the conversation.</span>
            </span>
            <i class="ph ph-arrow-right ail-banner-arrow"></i>
        `;
        banner.addEventListener('click', ailOpenModal);
        banner.addEventListener('mousemove', (e) => {
            const r = banner.getBoundingClientRect();
            banner.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
            banner.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
        });
        card.appendChild(banner);
    }

    function ailEnforceLimit({ showModal = true } = {}) {
        if (aiInput)  { aiInput.disabled = true;  aiInput.blur(); }
        if (aiSend)   { aiSend.disabled  = true; }
        document.querySelectorAll('.ai-pill').forEach(p => { p.disabled = true; });
        const pillsEl = document.getElementById('ai-section-pills');
        if (pillsEl) pillsEl.style.display = 'none';
        ailShowBanner();
        if (showModal) ailOpenModal();
    }

    // Disable visitor chat limit checks on load

    function addInlineMsg(text, type) {
        if (!aiResponse) return;
        const div = document.createElement('div');
        div.className = `ai-resp-msg ${type}`;
        div.textContent = text;
        aiResponse.appendChild(div);
    }

    function showInlineTyping() {
        if (!aiResponse) return;
        const dots = document.createElement('div');
        dots.className = 'ai-resp-typing';
        dots.id = 'ai-typing-dots';
        dots.innerHTML = '<span></span><span></span><span></span>';
        aiResponse.appendChild(dots);
    }

    function removeInlineTyping() {
        const el = document.getElementById('ai-typing-dots');
        if (el) el.remove();
    }

    function getLocalFallbackResponse(query) {
        const q = query.toLowerCase().trim();
        
        // 1. Greetings
        if (/^(hello|hi|hey|greetings|good morning|good afternoon|good evening|yo)\b/.test(q)) {
            return "Hello! I am the Pure AI Assistant. How can I help you today?";
        }

        // 1.5 Acknowledgements & Sentiments
        if (/^(great|good|nice|awesome|cool|thanks|thank you|ok|okay|perfect|fine|excellent|wonderful|wow|super|yep|agree|agreeable)\b/.test(q) || q === 'thank you' || q === 'thanks') {
            return "Glad to help! Let me know if you have any other questions.";
        }
        
        if (/^(no|nope|disagree|incorrect|wrong|cancel)\b/.test(q)) {
            return "Understood. Let me know if you need anything else.";
        }
        
        // 2. Who are you / Identity (using word boundaries to prevent matching "what are your products?")
        if (/\bwho are you\b/.test(q) || /\byour name\b/.test(q) || /\bwhat are you\b/.test(q) || /\bwho is pure ai\b/.test(q)) {
            return "I am the Pure AI Assistant. I help answer questions about our brand, products, and automation services.";
        }

        // 3. Products
        if (/\bproducts?\b/.test(q) || /\brobots?\b/.test(q) || /\bbots?\b/.test(q) || /\bnano\b/.test(q) || /\bdevices?\b/.test(q) || /\bhardware\b/.test(q)) {
            return "We offer two main products: Physical Robots (for manufacturing and logistics) and Intelligent Bots (for digital task automation).";
        }

        // 4. Services / Pillars
        if (/\bservices?\b/.test(q) || /\bpillars?\b/.test(q) || /\boffers?\b/.test(q) || /\bdo you do\b/.test(q) || /\bcapabilities\b/.test(q)) {
            return "Our services focus on six key areas: Agentic AI, Autonomous Operations, Predictive Intelligence, Digital Workforce, AI Infrastructure, and Real-Time Decision systems.";
        }

        // 5. Platform / Infrastructure / Compute
        if (/\bplatforms?\b/.test(q) || /\bsilicon\b/.test(q) || /\bcomputes?\b/.test(q) || /\blatency\b/.test(q) || /\bmesh\b/.test(q) || /\bspecs?\b/.test(q) || /\binfrastructure\b/.test(q)) {
            return "The Pure AI Platform runs on high-performance custom silicon with low latency (<4ms) and secure, self-healing encryption.";
        }

        // 6. Solutions / Automation / Reduction
        if (/\bsolutions?\b/.test(q) || /\bautomations?\b/.test(q) || /\bworkflows?\b/.test(q) || /\boptimizes?\b/.test(q) || /\befficiency\b/.test(q)) {
            return "We provide automation solutions that streamline workflows, optimize operations, and improve decision-making accuracy.";
        }

        // 7. Specific Industry Sub-queries
        if (/\bbanking\b/.test(q)) {
            return "In Banking, we deploy targeted AI models to optimize financial ecosystems, assess risk in real-time, and automate fraud detection.";
        }
        if (/\bhealthcare\b/.test(q)) {
            return "In Healthcare, we transform patient outcomes through autonomous diagnostics, predictive patient deterioration modeling, and resource allocation.";
        }
        if (/\blogistics\b/.test(q)) {
            return "In Logistics, we orchestrate global supply chains with zero-latency autonomous routing and adaptive fleet management.";
        }
        if (/\bmanufacturing\b/.test(q)) {
            return "In Manufacturing, we eliminate assembly line friction via self-healing robotic swarms and sub-millisecond machine vision quality control.";
        }
        if (/\bagriculture\b/.test(q)) {
            return "In Agriculture, we maximize crop yield using hyper-local climate intelligence, drone-based crop analysis, and autonomous nutrient dosing.";
        }
        if (/\bairlines?\b/.test(q) || /\baviation\b/.test(q)) {
            return "In Aviation and Airlines, we optimize airspace trajectory, fuel consumption, and run predictive maintenance to ensure safe operations.";
        }
        if (/\beducation\b/.test(q)) {
            return "In Education, we scale personalized hyper-learning environments using AI tutors adapted to individual cognitive patterns.";
        }
        if (/\bretail\b/.test(q)) {
            return "In Retail, we deploy omni-channel predictive inventory management and computer vision store analytics to optimize operations.";
        }
        if (/\binfrastructure\b/.test(q)) {
            return "In Infrastructure, we manage smart grids with low-latency swarm intelligence, energy load distribution, and traffic routing.";
        }

        // 7. General Industries / Sectors
        if (/\bindustr(y|ies)\b/.test(q) || /\bsectors?\b/.test(q)) {
            return "We serve key industries including Banking, Healthcare, Logistics, Manufacturing, Retail, and Infrastructure.";
        }

        // 8. BOHRAI Hub / Research
        if (/\bbohrai\b/.test(q) || /\bregistration\b/.test(q) || /\bregister\b/.test(q) || /\binnovations\b/.test(q)) {
            return "The BOHRAI Hub coordinates our research projects. You can contact the research team at innovations@pureaiglobal.com.";
        }

        // 9. Contact / Support / Email / Phone
        if (q.includes('contact') || q.includes('demo') || q.includes('reach') || q.includes('email') || q.includes('phone') || q.includes('support') || q.includes('office') || q.includes('address') || q.includes('location')) {
            return "You can contact us at gkai@pureaiglobal.com, call +65 6829 2127, or use the form at the bottom of the page.";
        }

        // 10. Pricing / Cost / Free / Trial
        if (q.includes('price') || q.includes('cost') || q.includes('free') || q.includes('pricing') || q.includes('quote') || q.includes('buy') || q.includes('purchase')) {
            return "Pricing is customized based on your business needs. Please email us at gkai@pureaiglobal.com for a quote.";
        }

        // 11. Security / Safety / Airgap / Encryption
        if (q.includes('secure') || q.includes('security') || q.includes('privacy') || q.includes('safe') || q.includes('encrypt') || q.includes('hack') || q.includes('data')) {
            return "We prioritize security by using private network architecture and secure encryption to protect all operations and data.";
        }

        // 12. General fallback
        return "I'm here to help with questions about Pure AI. Feel free to ask about our products, services, platform, or how we can automate your operations.";
    }

    let isGenerating = false;

    async function handleInlineSend(text) {
        if (isGenerating) return;

        const msg = text || (aiInput ? aiInput.value.trim() : '');
        if (!msg) return;
        if (aiInput) aiInput.value = '';

        // Clear previous messages to only show the active exchange
        if (aiResponse) aiResponse.innerHTML = '';

        // Count this message immediately so refresh/bypass can't exceed the cap.
        userMsgCount++;
        try { localStorage.setItem(AIL_KEY, String(userMsgCount)); } catch (_) {}

        // Hide pills after first interaction
        const pillsEl = document.getElementById('ai-section-pills');
        if (pillsEl) pillsEl.style.display = 'none';

        addInlineMsg(msg, 'user');
        chatHistory.push({ role: 'user', content: msg });
        
        showInlineTyping();
        isGenerating = true;

        // Check if query is one of the standard predefined button questions
        const cleanMsg = msg.toLowerCase().trim();
        const standardPillQueries = [
            "what are your products?",
            "what services do you offer?",
            "tell me about your platform",
            "what solutions do you provide?",
            "which industries do you serve?"
        ];
        
        let isStandardQuery = standardPillQueries.includes(cleanMsg);
        if (!isStandardQuery) {
            if (cleanMsg === "products" || cleanMsg === "services" || cleanMsg === "platform" || cleanMsg === "solutions" || cleanMsg === "industries") {
                isStandardQuery = true;
            }
        }

        if (isStandardQuery) {
            // Fast-path: respond instantly using local fallback context to ensure accuracy and speed
            setTimeout(() => {
                const reply = getLocalFallbackResponse(msg);
                removeInlineTyping();
                chatHistory.push({ role: 'assistant', content: reply });
                addInlineMsg(reply, 'bot');
                isGenerating = false;
            }, 300); // Small natural delay to briefly show typing animation
            return;
        }

        const OPENROUTER_API_KEY = localStorage.getItem('OPENROUTER_API_KEY') || 'YOUR_OPENROUTER_API_KEY_HERE';
        const OPENROUTER_MODEL = localStorage.getItem('OPENROUTER_MODEL') || 'meta-llama/llama-3-8b-instruct:free';

        let success = false;
        let reply = "";
        let errorMsg = "";

        if (OPENROUTER_API_KEY && OPENROUTER_API_KEY !== 'YOUR_OPENROUTER_API_KEY_HERE') {
            const modelsToTry = [
                OPENROUTER_MODEL,
                'meta-llama/llama-3-8b-instruct:free',
                'mistralai/mistral-7b-instruct:free',
                'microsoft/phi-3-mini-128k-instruct:free',
                'qwen/qwen-2-7b-instruct:free',
                'google/gemma-2-9b-it:free'
            ];
            const uniqueModels = [...new Set(modelsToTry)];

            for (let i = 0; i < uniqueModels.length; i++) {
                const currentModel = uniqueModels[i];
                console.log(`Attempting to contact swarm via model: ${currentModel}`);
                try {
                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                            'HTTP-Referer': window.location.origin,
                            'X-Title': 'Pure AI Website'
                        },
                        body: JSON.stringify({
                            model: currentModel,
                            messages: [
                                { role: 'system', content: WEBSITE_CONTEXT },
                                ...chatHistory.slice(-4) // Send last 4 messages to keep context window small
                            ],
                            temperature: 0.7,
                            max_tokens: 300
                        })
                    });

                    const data = await response.json();
                    
                    if (data && data.error) {
                        console.error(`Error with model ${currentModel}:`, data.error);
                        errorMsg = data.error.message || 'Unknown API error';
                    } else if (data && data.choices && data.choices.length > 0) {
                        reply = data.choices[0].message.content;
                        reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                        success = true;
                        break;
                    } else {
                        console.error(`Empty choices response with model ${currentModel}`);
                        errorMsg = 'Empty response from model';
                    }
                } catch (err) {
                    console.error(`Fetch exception with model ${currentModel}:`, err);
                    errorMsg = err.message || 'Fetch error';
                }
            }
        }

        // If OpenRouter wasn't configured, or if all OpenRouter models failed, try Puter AI keyless fallback
        if (!success) {
            if (typeof puter !== 'undefined') {
                console.log("OpenRouter not available or failed. Falling back to Puter AI...");
                try {
                    const puterMsgList = [
                        { role: 'system', content: WEBSITE_CONTEXT },
                        ...chatHistory.slice(-4)
                    ];
                    
                    const puterResponse = await puter.ai.chat(puterMsgList, {
                        model: 'openai/gpt-4o-mini'
                    });

                    if (puterResponse) {
                        reply = puterResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                        success = true;
                    } else {
                        errorMsg = "Puter AI returned an empty response.";
                    }
                } catch (puterErr) {
                    console.error("Puter AI failed:", puterErr);
                    errorMsg = puterErr.message || "Puter AI execution error";
                }
            } else {
                errorMsg = "OpenRouter key not configured, and Puter library is not loaded.";
            }
        }

        // If both failed or are unavailable, use local rule-based smart fallback based on WEBSITE_CONTEXT
        if (!success) {
            console.log("API pathways offline. Initializing local cognitive processor...");
            reply = getLocalFallbackResponse(msg);
            success = true;
        }

        removeInlineTyping();

        if (success) {
            chatHistory.push({ role: 'assistant', content: reply });
            addInlineMsg(reply, 'bot');
        } else {
            console.error('All model fallback options exhausted.');
            addInlineMsg(`Swarm Anomaly: All cognitive pathways exhausted. (${errorMsg})`, 'bot');
        }

        isGenerating = false;
    }

    if (aiSend) aiSend.addEventListener('click', () => handleInlineSend());
    if (aiInput) aiInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleInlineSend(); });
    aiPills.forEach(btn => {
        btn.addEventListener('click', () => {
            const msg = btn.getAttribute('data-msg');
            if (msg) handleInlineSend(msg);
        });
    });

    // ─────────────────────────────────────────────────────
    // 14. SECTOR SIDE PANEL LOGIC
    // ─────────────────────────────────────────────────────
    const sectorContentData = {
        'Banking': {
            icon: '<i class="ph ph-bank"></i>',
            desc: 'Deploying targeted AI models to optimize financial ecosystems. Real-time predictive risk assessment, automated fraud detection across millions of transactions, and personalized algorithmic liquidity management.',
            features: [
                'High-frequency trading models',
                'Neural fraud isolation',
                'Self-auditing compliance algorithms'
            ]
        },
        'Healthcare': {
            icon: '<i class="ph ph-hospital"></i>',
            desc: 'Transforming patient outcomes through autonomous diagnostics and operational AI. Streamlining hospital resource allocation, predictive patient deterioration modeling, and accelerated drug discovery pipelines.',
            features: [
                'Predictive diagnostic networks',
                'Algorithmic resource allocation',
                'Personalized genome analysis'
            ]
        },
        'Logistics': {
            icon: '<i class="ph ph-truck"></i>',
            desc: 'Orchestrating global supply chains with zero-latency autonomous routing. Adaptive fleet management that responds to microscopic geopolitical, weather, and traffic data instantly to prevent supply shock.',
            features: [
                'Dynamic ecosystem routing',
                'Predictive maintenance APIs',
                'Autonomous fleet orchestration'
            ]
        },
        'Manufacturing': {
            icon: '<i class="ph ph-factory"></i>',
            desc: 'Eliminating assembly line friction via self-healing robotic swarms. Machine vision quality control operating at 1,000 frames per second, ensuring zero-defect rates and dynamic yield optimization.',
            features: [
                'Swarm robotics coordination',
                'Sub-millisecond defect detection',
                'Autonomous yield forecasting'
            ]
        },
        'Agriculture': {
            icon: '<i class="ph ph-plant"></i>',
            desc: 'Maximizing planetary yield with hyper-local climate intelligence networks. Utilizing drone-based multispectral imaging and autonomous nutrient dispensing for perfect per-plant optimization.',
            features: [
                'Micro-climate predictive modeling',
                'Drone-based crop analysis',
                'Autonomous nutrient dosing'
            ]
        },
        'Airlines': {
            icon: '<i class="ph ph-airplane-tilt"></i>',
            desc: 'Optimizing airspace trajectory and dynamic ticket pricing matrices. Intelligent fuel consumption models and predictive maintenance logic to ensure absolute safety and minimal grounding downtime.',
            features: [
                'Algorithmic fuel optimization',
                'Dynamic load balancing',
                'Predictive parts degradation'
            ]
        },
        'Education': {
            icon: '<i class="ph ph-graduation-cap"></i>',
            desc: 'Scaling personalized hyper-learning environments. AI tutors that adapt strictly to individualized cognitive patterns, maximizing knowledge retention while identifying learning blind-spots in real-time.',
            features: [
                'Cognitive pattern mapping',
                'Dynamic curriculum generation',
                'Real-time behavioral analysis'
            ]
        },
        'Retail': {
            icon: '<i class="ph ph-shopping-cart"></i>',
            desc: 'Deploying omni-channel predictive inventory management. Computer vision store analytics and hyper-personalized consumer recommendation engines that trigger before purchase indecision.',
            features: [
                'Predictive inventory restock',
                'Real-time footfall analysis',
                'Hyper-personalized targeting'
            ]
        },
        'Corporation': {
            icon: '<i class="ph ph-buildings"></i>',
            desc: 'Full-stack enterprise augmentation. Autonomous legal contract auditing, semantic data lake querying, and systemic HR optimization to turn sluggish conglomerates into agile cognitive enterprises.',
            features: [
                'Semantic data extraction',
                'Autonomous contract auditing',
                'Enterprise-wide workflow AI'
            ]
        },
        'Infrastructure': {
            icon: '<i class="ph ph-globe"></i>',
            desc: 'Managing planetary smart grids with ultra-low latency swarm intelligence. Real-time energy load distribution, autonomous traffic grid orchestrations, and proactive structural integrity monitoring.',
            features: [
                'Smart grid load balancing',
                'Autonomous traffic redirection',
                'Predictive structural analysis'
            ]
        }
    };

    const sectorPanel = document.getElementById('sector-panel');
    const sectorClose = document.getElementById('sector-panel-close');
    const spIcon = document.getElementById('sp-icon');
    const spTitle = document.getElementById('sp-title');
    const spBody = document.getElementById('sp-body');

    document.querySelectorAll('.sector-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
            // Navigate to the solution page via the href
            const href = cell.getAttribute('href');
            if (href && href !== '#') {
                window.location.href = href;
            }
        });
    });

    if(sectorClose) {
        sectorClose.addEventListener('click', () => {
            if(sectorPanel) sectorPanel.classList.remove('active');
        });
    }

    if(sectorPanel) {
        sectorPanel.addEventListener('click', (e) => {
            if(e.target === sectorPanel) {
                sectorPanel.classList.remove('active');
            }
        });
    }

})();

// ── Contact Form Modal Injection ──
(function() {
    // Inject CSS
    const style = document.createElement('style');
    style.innerHTML = `
        #pureai-contact-modal {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px);
            z-index: 100000; display: flex; align-items: center; justify-content: center;
            opacity: 0; pointer-events: none; transition: opacity 0.4s ease;
        }
        #pureai-contact-modal.active { opacity: 1; pointer-events: auto; }
        .contact-modal-content {
            background: #0a0a0a; border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 3rem; border-radius: 16px; width: 90%; max-width: 500px;
            position: relative; transform: translateY(20px); transition: transform 0.4s ease;
        }
        #pureai-contact-modal.active .contact-modal-content { transform: translateY(0); }
        .contact-close {
            position: absolute; top: 1.5rem; right: 1.5rem; background: none; border: none;
            color: rgba(255, 255, 255, 0.5); font-size: 1.5rem; cursor: pointer; transition: color 0.3s;
        }
        .contact-close:hover { color: #fff; }
        .contact-modal-title { font-family: var(--f2, 'Space Grotesk', sans-serif); font-size: 2rem; margin-bottom: 0.5rem; color: #fff; }
        .contact-modal-subtitle { color: rgba(255, 255, 255, 0.5); font-size: 0.9rem; margin-bottom: 2rem; }
        .contact-form-group { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .contact-form-group > div { flex: 1; }
        .contact-input {
            width: 100%; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 0.8rem 1rem; color: #fff; border-radius: 8px; font-family: var(--f1, 'Inter', sans-serif);
            font-size: 0.9rem; outline: none; transition: border-color 0.3s; margin-bottom: 1rem;
        }
        .contact-input:focus { border-color: #4DEEEA; }
        textarea.contact-input { min-height: 120px; resize: vertical; }
        .contact-submit {
            width: 100%; background: #fff; color: #000; border: none; padding: 1rem;
            border-radius: 8px; font-family: var(--f2, 'Space Grotesk', sans-serif); font-size: 1rem;
            font-weight: 600; cursor: pointer; transition: background 0.3s;
        }
        .contact-submit:hover { background: #4DEEEA; }
    `;
    document.head.appendChild(style);

    // Inject HTML
    const modal = document.createElement('div');
    modal.id = 'pureai-contact-modal';
    modal.innerHTML = `
        <div class="contact-modal-content">
            <button class="contact-close" id="contact-close-btn">&times;</button>
            <h3 class="contact-modal-title">Get In Touch</h3>
            <p class="contact-modal-subtitle">Send us a message to discuss your inquiry. Response times vary.</p>
            <form id="pureai-contact-form">
                <div class="contact-form-group">
                    <div><input type="text" id="contact-fname" aria-label="First name" maxlength="80" class="contact-input" placeholder="First Name" required></div>
                    <div><input type="text" id="contact-lname" aria-label="Last name" maxlength="79" class="contact-input" placeholder="Last Name" required></div>
                </div>
                <input type="email" id="contact-email" aria-label="Email address" maxlength="254" class="contact-input" placeholder="Email Address" required>
                <input type="tel" id="contact-phone" aria-label="Phone number (optional)" maxlength="40" class="contact-input" placeholder="Phone Number (optional)">
                <textarea id="contact-message" aria-label="Your message" maxlength="5000" class="contact-input" placeholder="Your Message" required></textarea>
                <button type="submit" class="contact-submit">Send Message</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById('contact-close-btn');
    const form = document.getElementById('pureai-contact-form');

    function openModal(e) {
        if(e) e.preventDefault();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if(e.target === modal) closeModal();
    });

    // Intercept contact links
    document.addEventListener('click', (e) => {
        let target = e.target.closest('a');
        if(target && target.getAttribute('href') && target.getAttribute('href').endsWith('#contact-details')) {
            e.preventDefault();
            openModal();
            // Close mobile overlay if it's open
            const mobileOverlay = document.getElementById('mobile-overlay');
            if (mobileOverlay && mobileOverlay.classList.contains('open')) {
                mobileOverlay.classList.remove('open');
                const toggle = document.getElementById('mobile-toggle');
                if (toggle) toggle.innerHTML = '<i class="ph ph-list"></i>';
            }
        }
    });

    pureaiBindInquiry(form, 'contact', () => ({
        name: document.getElementById('contact-fname').value.trim() + ' ' + document.getElementById('contact-lname').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        message: document.getElementById('contact-message').value.trim()
    }), () => {});
})();
