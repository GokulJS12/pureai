/* ════════════════════════════════════════════════════════════════
   Product Enquiry Component — self-mounting floating CTA + modal.
   Drop-in: <script src="./product-enquiry.js" defer></script>
   ════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ───────── Auto-detect product name from current page ─────────
       Keyed by clean URL slug (extensionless). The lookup also tolerates
       legacy `.html` paths and trailing slashes, so the component works
       regardless of how the site is served. */
    const PRODUCT_MAP = {
        'robots-search': { name: 'Robots', icon: 'ph-robot' },
        'robots':        { name: 'Robots', icon: 'ph-robot' },
        'robots-2':      { name: 'Robots', icon: 'ph-robot' },
        'robots-3':      { name: 'Robots', icon: 'ph-robot' },
        'robots-4':      { name: 'Robots', icon: 'ph-robot' },
        'robots-5':      { name: 'Robots', icon: 'ph-robot' },
        'robots-6':      { name: 'Robots', icon: 'ph-robot' },
        'custom-bots':   { name: 'Custom Build Robots', icon: 'ph-wrench' },
        'nano-bots':     { name: 'Nano Bots', icon: 'ph-atom' },
        'trading-desk':  { name: 'Trading Desk', icon: 'ph-chart-line-up' },
        'naolytics':     { name: 'Naolytics', icon: 'ph-chart-pie-slice' },
        'aikage':        { name: 'AIKAGE', icon: 'ph-shield-check' },
        'papa-os':       { name: 'PAPA OS', icon: 'ph-desktop-tower' },
        'clip':          { name: 'CLIP', icon: 'ph-paperclip' },
        'market-genius': { name: 'Market Genius', icon: 'ph-trend-up' },
        'seo-genius':    { name: 'SEO Genius', icon: 'ph-magnifying-glass' }
    };

    const rawPath = (window.location.pathname.split('/').pop() || '').toLowerCase();
    const slug    = rawPath.replace(/\.html$/, '').replace(/\/$/, '');
    const product = PRODUCT_MAP[slug] || { name: (document.title || 'our product').split('—')[0].split('|')[0].trim(), icon: 'ph-cube' };

    /* ───────── Build button ───────── */
    const fab = document.createElement('button');
    fab.className = 'pe-fab';
    fab.id = 'pe-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Contact us for implementation');
    fab.innerHTML = `
        <span class="pe-led" aria-hidden="true"></span>
        <span class="pe-label">Contact for Implementation</span>
        <span class="pe-icon" aria-hidden="true"><i class="ph ph-paper-plane-tilt"></i></span>
        <span class="pe-corner" aria-hidden="true"></span>
    `;
    document.body.appendChild(fab);

    /* ───────── Build modal ───────── */
    const modal = document.createElement('div');
    modal.className = 'pe-modal';
    modal.id = 'pe-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="pe-backdrop" data-pe-close></div>
        <div class="pe-card" role="document">
            <button class="pe-close" type="button" aria-label="Close" data-pe-close><i class="ph ph-x"></i></button>

            <div class="pe-head">
                <div class="pe-status">Implementation Team · Available Now</div>
                <h2 class="pe-title">Let's build this for <em>your team.</em></h2>
                <p class="pe-sub">Tell us about your use case. Our solutions engineers will respond within 24 hours with a tailored implementation plan, deployment timeline, and commercial proposal.</p>
            </div>

            <div class="pe-body">
                <div class="pe-info">
                    <div class="pe-info-panel">
                        <div class="pe-tiny">You're asking about</div>
                        <div class="pe-prod"><i class="ph ${product.icon}"></i> ${product.name}</div>
                    </div>
                    <ul class="pe-contacts">
                        <li>
                            <i class="ph ph-envelope-simple"></i>
                            <div>
                                <span class="pe-hint">Email</span>
                                <a href="mailto:contact@pureai.global" style="color:inherit;">contact@pureai.global</a>
                            </div>
                        </li>
                        <li>
                            <i class="ph ph-phone"></i>
                            <div>
                                <span class="pe-hint">Singapore</span>
                                <a href="tel:+6568292127" style="color:inherit;">+65 6829 2127</a>
                            </div>
                        </li>
                        <li>
                            <i class="ph ph-globe-hemisphere-west"></i>
                            <div>
                                <span class="pe-hint">Hours</span>
                                24 / 7 · Autonomous Desk
                            </div>
                        </li>
                    </ul>
                    <div class="pe-sla">Replying within 24h</div>
                </div>

                <div class="pe-form-wrap">
                    <form class="pe-form" id="pe-form" novalidate>
                        <div class="pe-grid-2">
                            <div class="pe-field">
                                <label>Full Name<span class="req">*</span></label>
                                <input type="text" name="name" placeholder="Jane Doe" required>
                            </div>
                            <div class="pe-field">
                                <label>Business Email<span class="req">*</span></label>
                                <input type="email" name="email" placeholder="jane@company.com" required>
                            </div>
                        </div>
                        <div class="pe-grid-2">
                            <div class="pe-field">
                                <label>Company</label>
                                <input type="text" name="company" placeholder="Company / Organization">
                            </div>
                            <div class="pe-field">
                                <label>Timeline</label>
                                <select name="timeline">
                                    <option value="immediate">Immediate (< 30 days)</option>
                                    <option value="1-3m">1 – 3 months</option>
                                    <option value="3-6m">3 – 6 months</option>
                                    <option value="6m+">6 months +</option>
                                    <option value="exploring">Just exploring</option>
                                </select>
                            </div>
                        </div>
                        <div class="pe-field">
                            <label>Product of Interest</label>
                            <input type="text" name="product" value="${product.name}" readonly style="color:var(--pe-accent);cursor:not-allowed;">
                        </div>
                        <div class="pe-field">
                            <label>Tell us about your use case<span class="req">*</span></label>
                            <textarea name="message" placeholder="What are you trying to build or automate?" required></textarea>
                        </div>
                        <button type="submit" class="pe-submit">
                            <i class="ph ph-paper-plane-tilt"></i>
                            Send Implementation Enquiry
                        </button>
                    </form>
                </div>
            </div>

            <div class="pe-success">
                <div class="pe-check"><i class="ph ph-check"></i></div>
                <h3>Enquiry <em>received.</em></h3>
                <p>Thank you. Our implementation team has been notified and will respond directly to the email address you provided within <strong>24 hours</strong>.</p>
                <small>Pure AI · Solutions Engineering</small>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    /* ───────── Open / close logic ───────── */
    const closeEls = modal.querySelectorAll('[data-pe-close]');

    function openModal() {
        modal.classList.add('pe-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('pe-locked');
        // Focus first field after entrance
        setTimeout(() => {
            const firstInput = modal.querySelector('input[name="name"]');
            if (firstInput) firstInput.focus();
        }, 380);
    }
    function closeModal() {
        modal.classList.remove('pe-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('pe-locked');
    }

    fab.addEventListener('click', openModal);
    closeEls.forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('pe-open')) closeModal(); });

    /* ───────── Form submit (client-side demo) ───────── */
    const form = modal.querySelector('#pe-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Basic validation
        const req = form.querySelectorAll('[required]');
        let ok = true;
        req.forEach(f => {
            if (!f.value.trim()) { f.style.borderColor = '#FF6B6B'; ok = false; }
            else { f.style.borderColor = ''; }
        });
        if (!ok) return;

        // Simulate "sending" — swap to success state after short delay
        const btn = form.querySelector('.pe-submit');
        btn.disabled = true;
        btn.innerHTML = '<i class="ph ph-circle-notch" style="animation: peRadar 0.8s linear infinite;"></i> Sending…';
        setTimeout(() => {
            modal.classList.add('pe-sent');
        }, 900);

        // Here you could POST to your backend, e.g.:
        // fetch('/api/enquiry', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    });

    /* ───────── Open from external triggers ─────────
       Any element with `[data-pe-open]` will open the modal. */
    document.querySelectorAll('[data-pe-open]').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); openModal(); }));
})();
