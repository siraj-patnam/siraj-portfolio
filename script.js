/* ================================================================
   SIRAJ PATNAM PORTFOLIO — Interactive Script
   Neural Canvas + Agentic AI Chat
   ================================================================ */

// ── Neural Network Canvas Background ─────────────────────────────
(function initNeuralCanvas() {
  const canvas = document.getElementById('neural-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, nodes = [], mouse = { x: -1000, y: -1000 };
  const ACCENT = '#20b8cd';
  const NODE_COUNT = 60;
  const CONNECT_DIST = 180;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createNodes() {
    nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.15;
          ctx.strokeStyle = `rgba(32, 184, 205, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      // mouse connections
      const mx = nodes[i].x - mouse.x;
      const my = nodes[i].y - mouse.y;
      const md = Math.sqrt(mx * mx + my * my);
      if (md < 200) {
        const alpha = (1 - md / 200) * 0.3;
        ctx.strokeStyle = `rgba(32, 184, 205, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }

    // nodes
    for (const n of nodes) {
      ctx.fillStyle = ACCENT;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function update() {
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  resize();
  createNodes();
  loop();
  window.addEventListener('resize', () => { resize(); createNodes(); });
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
})();

// ── Navigation ────────────────────────────────────────────────────
(function initNav() {
  const nav = document.getElementById('nav');
  const btn = document.getElementById('mobile-btn');
  const menu = document.getElementById('mobile-menu');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      btn.classList.remove('open');
      menu.classList.remove('open');
    });
  });
})();

// ── Scroll Animations ─────────────────────────────────────────────
(function initAnimations() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
})();

// ── AI Chat ───────────────────────────────────────────────────────
(function initChat() {
  const messagesEl = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const suggestionsEl = document.getElementById('chat-suggestions');
  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  let conversationHistory = [];
  let isStreaming = false;

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // Enter to send (shift+enter for newline)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  // Suggestion buttons
  suggestionsEl.addEventListener('click', e => {
    const btn = e.target.closest('.suggestion-btn');
    if (btn) sendMessage(btn.dataset.msg);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || isStreaming) return;
    sendMessage(text);
  });

  async function sendMessage(text) {
    if (isStreaming) return;
    isStreaming = true;
    sendBtn.disabled = true;
    input.value = '';
    input.style.height = 'auto';

    // Hide suggestions after first message
    suggestionsEl.style.display = 'none';

    // Add user message
    appendMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });

    // Add typing indicator
    const typingEl = appendTypingIndicator();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          sessionId,
        }),
      });

      // Remove typing indicator
      typingEl.remove();

      if (!response.ok) throw new Error('Server error');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let currentMsgEl = null;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'text') {
              if (!currentMsgEl) {
                currentMsgEl = appendMessage('assistant', '');
              }
              assistantText += parsed.content;
              const textDiv = currentMsgEl.querySelector('.msg-text');
              textDiv.innerHTML = formatMarkdown(assistantText);
              scrollToBottom();
            }

            if (parsed.type === 'tool_start') {
              appendToolIndicator(parsed.label, 'running');
              scrollToBottom();
            }

            if (parsed.type === 'tool_done') {
              updateToolIndicator(parsed.label, parsed.success ? 'done' : 'error');
            }

            if (parsed.type === 'error') {
              appendMessage('assistant', parsed.content);
            }
          } catch (e) { /* skip parse errors */ }
        }
      }

      if (assistantText) {
        conversationHistory.push({ role: 'assistant', content: assistantText });
      }

    } catch (err) {
      typingEl.remove();
      appendMessage('assistant', 'Sorry, I\'m having trouble connecting right now. Please make sure the server is running and the Anthropic API key is configured in `secrets.js`.');
    }

    isStreaming = false;
    sendBtn.disabled = false;
    input.focus();
  }

  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;

    const avatarContent = role === 'assistant'
      ? `<svg class="perplexity-logo" viewBox="0 0 200 200" width="20" height="20"><path d="M100 20 L100 90 M100 110 L100 180 M20 100 L90 100 M110 100 L180 100 M38 38 L82 82 M118 118 L162 162 M162 38 L118 82 M82 118 L38 162" stroke="currentColor" stroke-width="14" stroke-linecap="round" fill="none"/></svg>`
      : 'You';

    div.innerHTML = `
      <div class="msg-avatar">${avatarContent}</div>
      <div class="msg-content">
        <div class="msg-text">${formatMarkdown(text)}</div>
      </div>`;

    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function appendTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'chat-message assistant';
    div.innerHTML = `
      <div class="msg-avatar">
        <svg class="perplexity-logo" viewBox="0 0 200 200" width="20" height="20"><path d="M100 20 L100 90 M100 110 L100 180 M20 100 L90 100 M110 100 L180 100 M38 38 L82 82 M118 118 L162 162 M162 38 L118 82 M82 118 L38 162" stroke="currentColor" stroke-width="14" stroke-linecap="round" fill="none"/></svg>
      </div>
      <div class="msg-content">
        <div class="msg-text">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function appendToolIndicator(label, status) {
    const div = document.createElement('div');
    div.className = `tool-indicator ${status === 'running' ? '' : status}`;
    div.dataset.toolLabel = label;

    if (status === 'running') {
      div.innerHTML = `<div class="tool-spinner"></div> ${label}...`;
    } else if (status === 'done') {
      div.innerHTML = `<span class="tool-check">&#10003;</span> ${label}`;
    }

    messagesEl.appendChild(div);
    return div;
  }

  function updateToolIndicator(label, status) {
    const el = messagesEl.querySelector(`.tool-indicator[data-tool-label="${label}"]:not(.done):not(.error)`);
    if (!el) return;
    el.className = `tool-indicator ${status}`;
    if (status === 'done') {
      el.innerHTML = `<span class="tool-check">&#10003;</span> ${label} — done`;
    } else if (status === 'error') {
      el.innerHTML = `<span>&#10007;</span> ${label} — failed`;
    }
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:rgba(32,184,205,0.1);padding:1px 5px;border-radius:3px;font-size:0.85em;color:#5ce0f0">$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(.*)$/, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');
  }
})();
