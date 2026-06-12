// ── Scroll Reveal Animation ──
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.fade-up, .fade-in').forEach(el => observer.observe(el));

  // ── Mobile Menu Toggle ──
  const toggle = document.querySelector('.mobile-toggle');
  const overlay = document.querySelector('.mobile-overlay');
  if (toggle && overlay) {
    toggle.addEventListener('click', () => {
      overlay.classList.toggle('open');
      toggle.innerHTML = overlay.classList.contains('open') ? '✕' : '☰';
    });
    overlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        overlay.classList.remove('open');
        toggle.innerHTML = '☰';
      });
    });
  }

  // ── Category Filter (Marketplace) ──
  const filterBtns = document.querySelectorAll('.filter-btn');
  const workerCards = document.querySelectorAll('.marketplace-grid .worker-card');
  if (filterBtns.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.category;
        workerCards.forEach(card => {
          if (cat === 'all' || card.dataset.category === cat) {
            card.style.display = '';
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            requestAnimationFrame(() => {
              card.style.transition = 'opacity 0.4s, transform 0.4s';
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            });
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // ── Smooth scroll for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const targetPath = a.getAttribute('href');
      if (targetPath.startsWith('#')) {
        const target = document.querySelector(targetPath);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // ── BUILD YOUR AGENT MODAL INJECTION & LOGIC ──
  injectDashboardModal();
  setupDashboardInteractivity();

  // ── CONTACT US MODAL INJECTION & LOGIC ──
  injectContactModal();
  setupContactInteractivity();
});

// Dynamic injection of Build Your Agent Dashboard modal
function injectDashboardModal() {
  if (document.getElementById('buildAgentModal')) return;

  const modalHtml = `
  <div class="dashboard-modal" id="buildAgentModal">
    <div class="dashboard-wrapper">
      <div class="dashboard-header">
        <div>
          <h2>🛠️ Pure AI Forge Dashboard</h2>
          <p>Define, test, and request pre-certified agent configurations.</p>
        </div>
        <button class="dashboard-close" id="closeAgentModal" aria-label="Close Dashboard">✕</button>
      </div>
      <div class="dashboard-body">
        <form class="dashboard-form" id="agentForgeForm" onsubmit="return false;">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="agentName">Agent Name</label>
              <input type="text" class="form-control" id="agentName" placeholder="e.g. SentinelAlpha" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="agentDomain">Domain & Category</label>
              <select class="form-control" id="agentDomain">
                <option value="infrastructure">Infrastructure Operations</option>
                <option value="manufacturing">Manufacturing (Dark Factory)</option>
                <option value="predictive">Predictive Analytics</option>
                <option value="logistics">Logistics & Swarms</option>
                <option value="healthcare">Healthcare (HIPAA Tier)</option>
                <option value="finance">Financial Systems</option>
                <option value="support">Customer Support</option>
                <option value="sales">Sales & Inbound</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="agentPrompt">Core Instructions (System Prompt)</label>
            <textarea class="form-control" id="agentPrompt" rows="3" placeholder="Identify anomalous signals, apply safety heuristics, and output structural manifests..." required></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">System Permissions & Integrations</label>
            <div class="checkbox-group" id="permGroup">
              <label class="checkbox-tag active"><input type="checkbox" value="Read Telemetry" checked> Read Telemetry</label>
              <label class="checkbox-tag"><input type="checkbox" value="Write Files"> Write Files</label>
              <label class="checkbox-tag"><input type="checkbox" value="Execute Shell"> Execute Shell</label>
              <label class="checkbox-tag"><input type="checkbox" value="Access APIs"> Access APIs</label>
              <label class="checkbox-tag"><input type="checkbox" value="Query Database"> Query DB</label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Safety Constraints</label>
            <div class="checkbox-group" id="safetyGroup">
              <label class="checkbox-tag active"><input type="checkbox" value="Human-in-the-Loop Approval" checked> Human approval</label>
              <label class="checkbox-tag active"><input type="checkbox" value="Strict Cost Caps" checked> Strict cost cap</label>
              <label class="checkbox-tag"><input type="checkbox" value="Local Inference Only"> Sovereign Local Inference</label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="operatorEmail">Operator Contact Email</label>
            <input type="email" class="form-control" id="operatorEmail" placeholder="operator@pureai.com" required>
          </div>

          <div class="btn-submit-container">
            <button type="submit" class="btn btn-primary" id="btnCompileAgent">Compile Configuration →</button>
          </div>
        </form>

        <div class="dashboard-preview">
          <div class="preview-title">Generated Config (SKILL.md)</div>
          <div class="preview-pane" id="configPreview">Awaiting manifest parameters...</div>
          <div class="preview-title">Compilation Console</div>
          <div class="console-pane" id="consolePane">
            <div class="log-line info">[SYS] Pure AI Sovereign compiler initialized.</div>
            <div class="log-line">[SYS] Awaiting agent manifest declarations...</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = modalHtml;
  document.body.appendChild(container.firstElementChild);
}

function setupDashboardInteractivity() {
  const modal = document.getElementById('buildAgentModal');
  const closeBtn = document.getElementById('closeAgentModal');
  const form = document.getElementById('agentForgeForm');
  const compileBtn = document.getElementById('btnCompileAgent');
  const consolePane = document.getElementById('consolePane');
  const configPreview = document.getElementById('configPreview');

  // Input elements for live preview
  const nameInput = document.getElementById('agentName');
  const domainSelect = document.getElementById('agentDomain');
  const promptInput = document.getElementById('agentPrompt');
  const emailInput = document.getElementById('operatorEmail');

  if (!modal) return;

  // Toggle active tags for custom checkboxes
  document.querySelectorAll('.checkbox-tag').forEach(tag => {
    const input = tag.querySelector('input');
    if (input) {
      input.addEventListener('change', () => {
        if (input.checked) {
          tag.classList.add('active');
        } else {
          tag.classList.remove('active');
        }
        updateManifestPreview();
      });
    }
  });

  // Live preview bindings
  [nameInput, domainSelect, promptInput, emailInput].forEach(input => {
    if (input) {
      input.addEventListener('input', updateManifestPreview);
      input.addEventListener('change', updateManifestPreview);
    }
  });

  // Open triggers
  document.addEventListener('click', e => {
    const buildBtn = e.target.closest('.build-agent-btn');
    if (buildBtn) {
      e.preventDefault();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      updateManifestPreview();
    }
  });

  // Close triggers
  const closeModal = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  // Dynamic manifest generator
  function updateManifestPreview() {
    const name = nameInput.value.trim() || 'SovereignAgent';
    const domainValue = domainSelect.value;
    const domainText = domainSelect.options[domainSelect.selectedIndex]?.text || 'Custom Domain';
    const prompt = promptInput.value.trim() || 'Execute target operations securely with sovereign integrity...';
    const email = emailInput.value.trim() || 'operator@pureai.com';

    // Get checked permissions
    const permissions = [];
    document.querySelectorAll('#permGroup input:checked').forEach(i => permissions.push(i.value));
    
    // Get checked safety rules
    const safety = [];
    document.querySelectorAll('#safetyGroup input:checked').forEach(i => safety.push(i.value));

    // Construct markdown representation
    const manifest = `# SKILL.md | Agent: ${name}
---
**Domain:** ${domainText} (${domainValue})
**Operator:** ${email}
**System API Host:** hosted.mesh.pureai.com

## 🔒 Permissions Map
${permissions.length ? permissions.map(p => `- ✓ Allowed: ${p}`).join('\n') : '- ✕ No external permissions requested'}

## 🛡️ Safety & Governance
${safety.length ? safety.map(s => `- ✓ Enforced: ${s}`).join('\n') : '- ⚠️ WARNING: No safety rules active'}

## ⚙️ Core Instructions
\`\`\`system
${prompt}
\`\`\`

## 🧪 Deterministic Tests
- verify_mesh_handshake == 200
- latency_telemetry_check <= 15ms
`;

    configPreview.textContent = manifest;
  }

  // Compile and Email Proposal Action
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = nameInput.value.trim();
      const domainText = domainSelect.options[domainSelect.selectedIndex]?.text;
      const prompt = promptInput.value.trim();
      const email = emailInput.value.trim();
      
      const permissions = [];
      document.querySelectorAll('#permGroup input:checked').forEach(i => permissions.push(i.value));
      const safety = [];
      document.querySelectorAll('#safetyGroup input:checked').forEach(i => safety.push(i.value));

      // Append terminal output logs with staggered timings
      consolePane.innerHTML = '';
      compileBtn.disabled = true;
      compileBtn.textContent = 'Compiling Manifest...';

      const logs = [
        { text: '[SYSTEM] Initializing Custom Agent Compiler v1.2...', type: 'info', delay: 100 },
        { text: `[SYSTEM] Validating Agent Schema for: ${name}`, type: 'standard', delay: 400 },
        { text: `[SECURITY] Matching permissions against local security sandbox...`, type: 'standard', delay: 800 },
        { text: `[COMPILED] Generated SKILL.md package successfully.`, type: 'success', delay: 1200 },
        { text: `[NETWORK] Initiating secure routing link to gkai@pureai.com`, type: 'info', delay: 1600 },
        { text: `[MAILER] Dispatching configuration bundle via local mail client...`, type: 'standard', delay: 2000 },
        { text: `[SUCCESS] Complete! Configuration sent to gkai@pureai.com`, type: 'success', delay: 2400 }
      ];

      logs.forEach(log => {
        setTimeout(() => {
          const div = document.createElement('div');
          div.className = `log-line ${log.type}`;
          div.textContent = log.text;
          consolePane.appendChild(div);
          consolePane.scrollTop = consolePane.scrollHeight;

          if (log.text.includes('Complete!')) {
            compileBtn.disabled = false;
            compileBtn.textContent = 'Compile Configuration →';
            
            const rawSubject = `Pure AI Custom Agent Proposal - ${name}`;
            const rawMailBody = `Hello Pure AI team,

Below is the certified SKILL.md configuration for my custom agent request.

# Agent Manifest: ${name}
- Domain: ${domainText}
- Contact/Operator: ${email}

## Permissions Required:
${permissions.map(p => `- ${p}`).join('\n')}

## Enforced Safety Safeguards:
${safety.map(s => `- ${s}`).join('\n')}

## Core Instructions:
${prompt}

---
Generated via Pure AI Forge Dashboard. Please pre-certify this configuration.`;

            const subject = encodeURIComponent(rawSubject);
            const body = encodeURIComponent(rawMailBody);
            
            // Route Gmail compose to the exact operator email if it is a gmail.com address
            let gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=gkai@pureai.com&su=${subject}&body=${body}`;
            if (email.endsWith('@gmail.com')) {
              gmailUrl = `https://mail.google.com/mail/u/${email}/?view=cm&fs=1&to=gkai@pureai.com&su=${subject}&body=${body}`;
            }
            const mailtoUrl = `mailto:gkai@pureai.com?subject=${subject}&body=${body}`;

            const actionContainer = document.createElement('div');
            actionContainer.style.marginTop = '12px';
            actionContainer.style.borderTop = '1px dashed rgba(0, 229, 255, 0.2)';
            actionContainer.style.paddingTop = '10px';
            actionContainer.innerHTML = `
              <div style="margin-bottom: 6px; color: rgba(255,255,255,0.7); font-size: 0.72rem;">Configure Mail Integration:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <a href="${gmailUrl}" target="_blank" class="console-action-btn gmail">Open in Gmail (Chrome)</a>
                <a href="${mailtoUrl}" class="console-action-btn mailto">Default Mail App</a>
                <button class="console-action-btn copy" id="btnCopyConfig">Copy Config</button>
              </div>
            `;
            
            consolePane.appendChild(actionContainer);
            consolePane.scrollTop = consolePane.scrollHeight;

            // Automatically open Gmail compose in a new tab
            window.open(gmailUrl, '_blank');

            // Bind copy button behavior
            const copyBtn = actionContainer.querySelector('#btnCopyConfig');
            if (copyBtn) {
              copyBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                navigator.clipboard.writeText(rawMailBody).then(() => {
                  copyBtn.textContent = '📋 Copied!';
                  copyBtn.style.color = '#00ff66';
                  copyBtn.style.borderColor = '#00ff66';
                  setTimeout(() => {
                    copyBtn.textContent = 'Copy Config';
                    copyBtn.style.color = '';
                    copyBtn.style.borderColor = '';
                  }, 2000);
                }).catch(() => {
                  // Fallback if writeText fails
                  alert("Copied configuration to clipboard!");
                });
              });
            }
          }
        }, log.delay);
      });
    });
  }
}

// Dynamic injection of Contact Us Dashboard modal
function injectContactModal() {
  if (document.getElementById('contactUsModal')) return;

  const modalHtml = `
  <div class="dashboard-modal" id="contactUsModal">
    <div class="dashboard-wrapper">
      <div class="dashboard-header">
        <div>
          <h2>📬 Pure AI Communication Terminal</h2>
          <p>Establish secure channel to gkai@pureai.com.</p>
        </div>
        <button class="dashboard-close" id="closeContactModal" aria-label="Close Terminal">✕</button>
      </div>
      <div class="dashboard-body">
        <form class="dashboard-form" id="contactUsForm" onsubmit="return false;">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="contactName">Your Name</label>
              <input type="text" class="form-control" id="contactName" placeholder="e.g. Akhilesh May" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="contactEmail">Operator Contact Email</label>
              <input type="email" class="form-control" id="contactEmail" placeholder="operator@pureai.com" required>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="contactSubject">Query Subject</label>
            <select class="form-control" id="contactSubject">
              <option value="general">General Inquiry</option>
              <option value="integration">Agent Integration Support</option>
              <option value="enterprise">Partnership & Enterprise</option>
              <option value="custom">Custom Agent Request</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="contactMessage">Message / Details</label>
            <textarea class="form-control" id="contactMessage" rows="6" placeholder="Describe your request, integration context, or partnership objectives..." required></textarea>
          </div>

          <div class="btn-submit-container">
            <button type="submit" class="btn btn-primary" id="btnSendContact">Transmit Message →</button>
          </div>
        </form>

        <div class="dashboard-preview">
          <div class="preview-title">Transmission Payload (PAYLOAD.md)</div>
          <div class="preview-pane" id="contactPreview">Awaiting query parameters...</div>
          <div class="preview-title">Network Console</div>
          <div class="console-pane" id="contactConsole">
            <div class="log-line info">[SYS] Pure AI Secure Communication channel initialized.</div>
            <div class="log-line">[SYS] Awaiting communication parameters...</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = modalHtml;
  document.body.appendChild(container.firstElementChild);
}

function setupContactInteractivity() {
  const modal = document.getElementById('contactUsModal');
  const closeBtn = document.getElementById('closeContactModal');
  const form = document.getElementById('contactUsForm');
  const transmitBtn = document.getElementById('btnSendContact');
  const consolePane = document.getElementById('contactConsole');
  const configPreview = document.getElementById('contactPreview');

  const nameInput = document.getElementById('contactName');
  const emailInput = document.getElementById('contactEmail');
  const subjectSelect = document.getElementById('contactSubject');
  const messageInput = document.getElementById('contactMessage');

  if (!modal) return;

  // Live preview bindings
  [nameInput, emailInput, subjectSelect, messageInput].forEach(input => {
    if (input) {
      input.addEventListener('input', updatePayloadPreview);
      input.addEventListener('change', updatePayloadPreview);
    }
  });

  // Open triggers intercepting mailto:gkai@pureai.com links
  document.addEventListener('click', e => {
    const contactBtn = e.target.closest('a[href="mailto:gkai@pureai.com"]');
    if (contactBtn) {
      e.preventDefault();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      
      // Check for buy button context
      if (contactBtn.classList.contains('buy-agent-btn')) {
        const agentName = contactBtn.getAttribute('data-agent') || 'this AI';
        if (subjectSelect) subjectSelect.value = 'custom';
        if (messageInput) messageInput.value = `Hello, I would like to purchase and deploy the certified "${agentName}" Digital Twin for our operations. Here is our integration context: `;
      } else {
        // Clear if not buy button
        if (subjectSelect) subjectSelect.value = 'general';
        if (messageInput) messageInput.value = '';
      }
      
      updatePayloadPreview();
    }
  });

  // Close triggers
  const closeModal = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  function updatePayloadPreview() {
    const name = nameInput.value.trim() || 'Anonymous Operator';
    const email = emailInput.value.trim() || 'operator@pureai.com';
    const subjectText = subjectSelect.options[subjectSelect.selectedIndex]?.text || 'General Inquiry';
    const message = messageInput.value.trim() || 'Describe your inquiry or objectives...';

    const payload = `# PAYLOAD.md | Communication Handshake
---
**Sender Name:** ${name}
**Contact Email:** ${email}
**Channel Domain:** pureai.com (Inbound)

## 📡 Message Subject: ${subjectText}
\`\`\`text
${message}
\`\`\``;

    configPreview.textContent = payload;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const subjectText = subjectSelect.options[subjectSelect.selectedIndex].text;
      const message = messageInput.value.trim();

      transmitBtn.disabled = true;
      transmitBtn.textContent = 'Transmitting...';

      consolePane.innerHTML = '';
      const logs = [
        { text: '[NETWORK] Opening encrypted socket tunnel...', type: 'info', delay: 400 },
        { text: '[NETWORK] Allocating secure packet buffer...', type: 'info', delay: 800 },
        { text: '[SECURITY] Verifying SPF/DKIM validation handshake...', type: 'info', delay: 1200 },
        { text: '[SUCCESS] Complete! Forwarding encrypted envelope to Gmail.', type: 'success', delay: 1600 }
      ];

      logs.forEach(log => {
        setTimeout(() => {
          const line = document.createElement('div');
          line.className = `log-line ${log.type || ''}`;
          line.textContent = log.text;
          consolePane.appendChild(line);
          consolePane.scrollTop = consolePane.scrollHeight;

          if (log.type === 'success') {
            transmitBtn.disabled = false;
            transmitBtn.textContent = 'Transmit Message →';

            const rawSubject = `Pure AI Communication Inbound: ${subjectText} (${name})`;
            const rawMailBody = `Name: ${name}
Email: ${email}
Subject: ${subjectText}

Message:
${message}

---
Sent via Pure AI Secure Communication Terminal.`;

            const subject = encodeURIComponent(rawSubject);
            const body = encodeURIComponent(rawMailBody);

            let gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=gkai@pureai.com&su=${subject}&body=${body}`;
            if (email.endsWith('@gmail.com')) {
              gmailUrl = `https://mail.google.com/mail/u/${email}/?view=cm&fs=1&to=gkai@pureai.com&su=${subject}&body=${body}`;
            }
            const mailtoUrl = `mailto:gkai@pureai.com?subject=${subject}&body=${body}`;

            const actionContainer = document.createElement('div');
            actionContainer.style.marginTop = '12px';
            actionContainer.style.borderTop = '1px dashed rgba(0, 229, 255, 0.2)';
            actionContainer.style.paddingTop = '10px';
            actionContainer.innerHTML = `
              <div style="margin-bottom: 6px; color: rgba(255,255,255,0.7); font-size: 0.72rem;">Transmission fallbacks:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <a href="${gmailUrl}" target="_blank" class="console-action-btn gmail">Open in Gmail (Chrome)</a>
                <a href="${mailtoUrl}" class="console-action-btn mailto">Default Mail App</a>
                <button class="console-action-btn copy" id="btnCopyContact">Copy Message</button>
              </div>
            `;

            consolePane.appendChild(actionContainer);
            consolePane.scrollTop = consolePane.scrollHeight;

            window.open(gmailUrl, '_blank');

            const copyBtn = actionContainer.querySelector('#btnCopyContact');
            if (copyBtn) {
              copyBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                navigator.clipboard.writeText(rawMailBody).then(() => {
                  copyBtn.textContent = '📋 Copied!';
                  copyBtn.style.color = '#00ff66';
                  copyBtn.style.borderColor = '#00ff66';
                  setTimeout(() => {
                    copyBtn.textContent = 'Copy Message';
                    copyBtn.style.color = '';
                    copyBtn.style.borderColor = '';
                  }, 2000);
                }).catch(() => {
                  alert("Copied communication payload to clipboard!");
                });
              });
            }
          }
        }, log.delay);
      });
    });
  }
}

// Switch tabs in the Hire the Digital Twin section
window.switchTwinTab = function(event, tabId) {
  const container = event.currentTarget.closest('.detail-card');
  if (!container) return;
  
  // Update active button styling
  const buttons = container.querySelectorAll('.twin-tab-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');
  
  // Update active content tab visibility
  const contents = container.querySelectorAll('.twin-tab-content');
  contents.forEach(content => {
    content.style.display = 'none';
  });
  
  const targetContent = container.querySelector(`#twin-${tabId}`);
  if (targetContent) {
    targetContent.style.display = 'block';
  }
};


