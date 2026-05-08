/* ================================================================
   SIRAJ PATNAM PORTFOLIO
   3D Neural Network + Agentic AI Chat + Voice + Theme + Loader
   ================================================================ */

// ── Page Loader + Hero Reveal ────────────────────────────────────
(function initLoader() {
  window.addEventListener('load', () => {
    setTimeout(() => {
      document.getElementById('page-loader').classList.add('hidden');
      document.body.classList.add('loaded');
    }, 2000);
  });
  // Fallback in case load event already fired
  if (document.readyState === 'complete') {
    setTimeout(() => {
      document.getElementById('page-loader').classList.add('hidden');
      document.body.classList.add('loaded');
    }, 2000);
  }
})();

// ── 3D Neural Network (Three.js) ────────────────────────────────
(function initNeural3D() {
  if (typeof THREE === 'undefined') return;
  const container = document.getElementById('neural-3d');
  if (!container) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 300;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ACCENT = new THREE.Color(0x20b8cd);
  const PURPLE = new THREE.Color(0xa78bfa);
  const NODE_COUNT = 120;
  const CONNECT_DIST = 80;

  // Create nodes
  const positions = new Float32Array(NODE_COUNT * 3);
  const velocities = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 500;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 500;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
    velocities.push({
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.15,
    });
  }

  // Points (nodes)
  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointsMat = new THREE.PointsMaterial({
    color: ACCENT, size: 3, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  // Lines (connections) — dynamic
  const lineGeo = new THREE.BufferGeometry();
  const maxLines = NODE_COUNT * 6;
  const linePositions = new Float32Array(maxLines * 6);
  const lineColors = new Float32Array(maxLines * 6);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  let mouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  function animate() {
    requestAnimationFrame(animate);

    // Update positions
    const pos = pointsGeo.attributes.position.array;
    for (let i = 0; i < NODE_COUNT; i++) {
      pos[i * 3] += velocities[i].x;
      pos[i * 3 + 1] += velocities[i].y;
      pos[i * 3 + 2] += velocities[i].z;
      if (Math.abs(pos[i * 3]) > 250) velocities[i].x *= -1;
      if (Math.abs(pos[i * 3 + 1]) > 250) velocities[i].y *= -1;
      if (Math.abs(pos[i * 3 + 2]) > 150) velocities[i].z *= -1;
    }
    pointsGeo.attributes.position.needsUpdate = true;

    // Update connections
    let lineIdx = 0;
    const lp = lineGeo.attributes.position.array;
    const lc = lineGeo.attributes.color.array;
    for (let i = 0; i < NODE_COUNT && lineIdx < maxLines; i++) {
      for (let j = i + 1; j < NODE_COUNT && lineIdx < maxLines; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < CONNECT_DIST) {
          const alpha = 1 - dist / CONNECT_DIST;
          const c = i % 3 === 0 ? PURPLE : ACCENT;
          const base = lineIdx * 6;
          lp[base] = pos[i * 3]; lp[base + 1] = pos[i * 3 + 1]; lp[base + 2] = pos[i * 3 + 2];
          lp[base + 3] = pos[j * 3]; lp[base + 4] = pos[j * 3 + 1]; lp[base + 5] = pos[j * 3 + 2];
          lc[base] = c.r * alpha; lc[base + 1] = c.g * alpha; lc[base + 2] = c.b * alpha;
          lc[base + 3] = c.r * alpha; lc[base + 4] = c.g * alpha; lc[base + 5] = c.b * alpha;
          lineIdx++;
        }
      }
    }
    // Clear remaining
    for (let i = lineIdx * 6; i < maxLines * 6; i++) { lp[i] = 0; lc[i] = 0; }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    lineGeo.setDrawRange(0, lineIdx * 2);

    // Mouse influence on camera
    camera.position.x += (mouse.x * 30 - camera.position.x) * 0.02;
    camera.position.y += (mouse.y * 30 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    scene.rotation.y += 0.0005;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();

// ── Theme Toggle ──────────────────────────────────────────────────
(function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const html = document.documentElement;
  const saved = localStorage.getItem('theme');
  if (saved) html.setAttribute('data-theme', saved);

  toggle.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
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

// ── Spaceship Chat Widget Toggle ─────────────────────────────────
(function initShipWidget() {
  const widget = document.getElementById('ship-widget');
  const shipBtn = document.getElementById('ship-btn');
  const closeBtn = document.getElementById('ship-close');
  if (!widget || !shipBtn) return;

  function toggleChat() {
    widget.classList.toggle('open');
    if (widget.classList.contains('open')) {
      document.getElementById('chat-input')?.focus();
    }
  }

  shipBtn.addEventListener('click', toggleChat);
  closeBtn?.addEventListener('click', toggleChat);

  // Nav/hero CTA triggers
  document.querySelectorAll('.ship-nav-trigger').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      if (!widget.classList.contains('open')) toggleChat();
      // Close mobile menu if open
      document.getElementById('mobile-btn')?.classList.remove('open');
      document.getElementById('mobile-menu')?.classList.remove('open');
    });
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && widget.classList.contains('open')) toggleChat();
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

// ── Live Coding Terminal ──────────────────────────────────────────
(function initTerminal() {
  const codeEl = document.getElementById('terminal-code');
  if (!codeEl) return;

  const codeLines = [
    ['<span class="cm"># RAG Pipeline — Siraj @ Perplexity AI</span>'],
    ['<span class="kw">from</span> langchain <span class="kw">import</span> LLMChain'],
    ['<span class="kw">from</span> pinecone <span class="kw">import</span> Index'],
    ['<span class="kw">from</span> transformers <span class="kw">import</span> AutoModel'],
    [''],
    ['<span class="kw">class</span> <span class="fn">RAGPipeline</span>:'],
    ['    <span class="kw">def</span> <span class="fn">__init__</span>(<span class="op">self</span>):'],
    ['        self.embedder = <span class="fn">AutoModel</span>(<span class="str">"sentence-transformers"</span>)'],
    ['        self.index = <span class="fn">Index</span>(<span class="str">"knowledge-base"</span>)'],
    ['        self.llm = <span class="fn">LLMChain</span>(model=<span class="str">"llama-3"</span>)'],
    [''],
    ['    <span class="kw">async def</span> <span class="fn">query</span>(<span class="op">self</span>, question):'],
    ['        embedding = self.embedder.<span class="fn">encode</span>(question)'],
    ['        docs = self.index.<span class="fn">search</span>(embedding, top_k=<span class="num">5</span>)'],
    ['        context = <span class="str">"\\n"</span>.<span class="fn">join</span>(d.text <span class="kw">for</span> d <span class="kw">in</span> docs)'],
    ['        <span class="kw">return await</span> self.llm.<span class="fn">generate</span>('],
    ['            context=context, query=question'],
    ['        )'],
  ];

  let lineIdx = 0;
  let charIdx = 0;
  let currentHTML = '';

  function getPlainLength(html) {
    return html.replace(/<[^>]*>/g, '').length;
  }

  function typeNext() {
    if (lineIdx >= codeLines.length) {
      // Restart after pause
      setTimeout(() => { currentHTML = ''; lineIdx = 0; charIdx = 0; typeNext(); }, 3000);
      return;
    }

    const line = codeLines[lineIdx][0];
    const plainLen = getPlainLength(line);

    if (charIdx <= plainLen) {
      // Build partial line by counting only visible chars
      let visible = 0, partialHTML = '', inTag = false;
      for (let i = 0; i < line.length && visible <= charIdx; i++) {
        if (line[i] === '<') inTag = true;
        if (!inTag) visible++;
        partialHTML += line[i];
        if (line[i] === '>') inTag = false;
        // If we just hit our target visible count, also close any open tag
        if (!inTag && visible === charIdx) {
          // Include rest of any tag that follows
          let j = i + 1;
          while (j < line.length && line[j] === '<') {
            while (j < line.length && line[j] !== '>') { partialHTML += line[j]; j++; }
            if (j < line.length) { partialHTML += line[j]; j++; }
          }
          break;
        }
      }

      codeEl.innerHTML = currentHTML + partialHTML + '<span class="cursor-line"></span>';
      charIdx++;
      setTimeout(typeNext, 30 + Math.random() * 40);
    } else {
      currentHTML += line + '\n';
      lineIdx++;
      charIdx = 0;
      setTimeout(typeNext, 100);
    }
  }

  // Start after loader finishes
  setTimeout(typeNext, 2500);
})();

// ── AI Chat ───────────────────────────────────────────────────────
(function initChat() {
  const messagesEl = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const suggestionsEl = document.getElementById('chat-suggestions');
  const followupsEl = document.getElementById('smart-followups');
  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  let conversationHistory = [];
  let isStreaming = false;
  let messageCount = 0;

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  suggestionsEl.addEventListener('click', e => {
    const btn = e.target.closest('.suggestion-btn');
    if (btn) sendMessage(btn.dataset.msg);
  });

  followupsEl.addEventListener('click', e => {
    const btn = e.target.closest('.followup-btn');
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
    followupsEl.innerHTML = '';

    suggestionsEl.style.display = 'none';
    appendMessage('user', text);
    conversationHistory.push({ role: 'user', content: text });
    messageCount++;

    const typingEl = appendTypingIndicator();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory, sessionId }),
      });

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
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'text') {
              if (!currentMsgEl) currentMsgEl = appendMessage('assistant', '');
              assistantText += parsed.content;
              currentMsgEl.querySelector('.msg-text').innerHTML = formatMarkdown(assistantText);
              scrollToBottom();
            }
            if (parsed.type === 'tool_start') { appendToolIndicator(parsed.label, 'running'); scrollToBottom(); }
            if (parsed.type === 'tool_done') { updateToolIndicator(parsed.label, parsed.success ? 'done' : 'error'); }
            if (parsed.type === 'error') { appendMessage('assistant', parsed.content); }
          } catch (e) { /* skip */ }
        }
      }

      if (assistantText) {
        conversationHistory.push({ role: 'assistant', content: assistantText });
        showSmartFollowups(assistantText);
      }
    } catch (err) {
      typingEl.remove();
      appendMessage('assistant', 'Sorry, I\'m having trouble connecting. Please make sure the server is running and the Anthropic API key is configured in `secrets.js`.');
    }

    isStreaming = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // ── Smart Follow-ups ──────────────────────────────────────────
  function showSmartFollowups(lastResponse) {
    followupsEl.innerHTML = '';
    const lower = lastResponse.toLowerCase();
    const suggestions = [];

    if (messageCount === 1) {
      suggestions.push({ label: 'Tell me about his LLM work', msg: 'Can you go deeper into Siraj\'s experience with LLMs and RAG systems?' });
      suggestions.push({ label: 'Schedule a call', msg: 'I\'d love to schedule a call with Siraj.' });
    }
    if (lower.includes('schedule') || lower.includes('meeting') || lower.includes('calendar')) {
      if (!lower.includes('confirmed') && !lower.includes('booked')) {
        suggestions.push({ label: 'Show me available times', msg: 'What times are available this week?' });
      }
    }
    if (lower.includes('resume') || lower.includes('cv')) {
      suggestions.push({ label: 'Email it to me', msg: 'Can you email me the resume? My email is ' });
    }
    if (lower.includes('perplexity') || lower.includes('current role')) {
      suggestions.push({ label: 'Previous experience?', msg: 'What did Siraj do before Perplexity AI?' });
    }
    if (lower.includes('accenture') || lower.includes('previous')) {
      suggestions.push({ label: 'What about certifications?', msg: 'What certifications does Siraj have?' });
    }
    if (suggestions.length === 0 && messageCount >= 2) {
      suggestions.push({ label: 'Get his resume', msg: 'Can I get Siraj\'s resume?' });
      suggestions.push({ label: 'Schedule a call', msg: 'I\'d like to schedule a call with Siraj.' });
    }

    suggestions.slice(0, 3).forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'followup-btn';
      btn.dataset.msg = s.msg;
      btn.textContent = s.label;
      followupsEl.appendChild(btn);
    });
  }

  // ── Voice Input (Web Speech API) ──────────────────────────────
  const voiceBtn = document.getElementById('voice-btn');
  if (voiceBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let isRecording = false;

    voiceBtn.addEventListener('click', () => {
      if (isRecording) {
        recognition.stop();
        return;
      }
      isRecording = true;
      voiceBtn.classList.add('recording');
      input.placeholder = 'Listening...';
      recognition.start();
    });

    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      input.value = transcript;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    };

    recognition.onend = () => {
      isRecording = false;
      voiceBtn.classList.remove('recording');
      input.placeholder = 'Ask about Siraj\'s experience, schedule a call, or request his resume...';
      // Auto-send if there's text
      if (input.value.trim()) {
        sendMessage(input.value.trim());
      }
    };

    recognition.onerror = () => {
      isRecording = false;
      voiceBtn.classList.remove('recording');
      input.placeholder = 'Voice not available. Type your message...';
    };
  } else if (voiceBtn) {
    voiceBtn.style.display = 'none';
  }

  // ── Helpers ───────────────────────────────────────────────────
  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    const avatarContent = role === 'assistant'
      ? '<svg class="perplexity-logo" viewBox="0 0 200 200" width="20" height="20"><path d="M100 20 L100 90 M100 110 L100 180 M20 100 L90 100 M110 100 L180 100 M38 38 L82 82 M118 118 L162 162 M162 38 L118 82 M82 118 L38 162" stroke="currentColor" stroke-width="14" stroke-linecap="round" fill="none"/></svg>'
      : 'You';
    div.innerHTML = `
      <div class="msg-avatar">${avatarContent}</div>
      <div class="msg-content"><div class="msg-text">${formatMarkdown(text)}</div></div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function appendTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'chat-message assistant';
    div.innerHTML = `
      <div class="msg-avatar"><svg class="perplexity-logo" viewBox="0 0 200 200" width="20" height="20"><path d="M100 20 L100 90 M100 110 L100 180 M20 100 L90 100 M110 100 L180 100 M38 38 L82 82 M118 118 L162 162 M162 38 L118 82 M82 118 L38 162" stroke="currentColor" stroke-width="14" stroke-linecap="round" fill="none"/></svg></div>
      <div class="msg-content"><div class="msg-text"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function appendToolIndicator(label, status) {
    const div = document.createElement('div');
    div.className = `tool-indicator ${status === 'running' ? '' : status}`;
    div.dataset.toolLabel = label;
    div.innerHTML = status === 'running'
      ? `<div class="tool-spinner"></div> ${label}...`
      : `<span class="tool-check">&#10003;</span> ${label}`;
    messagesEl.appendChild(div);
    return div;
  }

  function updateToolIndicator(label, status) {
    const el = messagesEl.querySelector(`.tool-indicator[data-tool-label="${label}"]:not(.done):not(.error)`);
    if (!el) return;
    el.className = `tool-indicator ${status}`;
    el.innerHTML = status === 'done'
      ? `<span class="tool-check">&#10003;</span> ${label} — done`
      : `<span>&#10007;</span> ${label} — failed`;
  }

  function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

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

// ── Cyberpunk Click Particles ────────────────────────────────────
(function initClickParticles() {
  const hexChars = '0123456789ABCDEF';
  const glyphs = ['>', '//', '{}', '[]', '0x', '&&', '|>', '=>', '::','$$', '%%', '<<', '>>'];

  document.addEventListener('click', e => {
    if (e.target.closest('a, button, input, textarea, .chat-container')) return;

    // Spawn glitch text particles
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      const type = Math.random();

      if (type < 0.4) {
        // Hex code fragment
        el.textContent = '0x' + Array.from({length: 2 + Math.floor(Math.random() * 3)}, () => hexChars[Math.floor(Math.random() * 16)]).join('');
      } else if (type < 0.7) {
        // Glyph
        el.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      } else {
        // Binary fragment
        el.textContent = Array.from({length: 4 + Math.floor(Math.random() * 5)}, () => Math.random() > 0.5 ? '1' : '0').join('');
      }

      el.className = 'cyber-particle';
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const dist = 50 + Math.random() * 90;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 20;
      const duration = 0.7 + Math.random() * 0.5;
      const delay = Math.random() * 0.1;
      const color = Math.random() > 0.5 ? 'rgba(32,184,205,0.9)' : 'rgba(167,139,250,0.9)';

      el.style.cssText = `
        left:${e.clientX}px; top:${e.clientY}px;
        color:${color};
        --tx:${tx}px; --ty:${ty}px;
        animation: cyberBurst ${duration}s ease-out ${delay}s forwards;
      `;

      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }

    // Electric ring flash
    const ring = document.createElement('div');
    ring.className = 'cyber-ring';
    ring.style.cssText = `left:${e.clientX}px; top:${e.clientY}px;`;
    document.body.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove());
  });
})();
