'use strict';

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Load secrets from secrets.js (local) or environment variables (deployed)
let secrets;
try { secrets = require('./secrets'); } catch {
  secrets = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    OWNER_NAME: process.env.OWNER_NAME || 'Siraj Patnam',
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    OWNER_PHONE: process.env.OWNER_PHONE || '+1 (314) 393-9371',
    OWNER_LINKEDIN: process.env.OWNER_LINKEDIN,
    OWNER_TIMEZONE: process.env.OWNER_TIMEZONE || 'America/Los_Angeles',
    AVAILABILITY: {
      timezone: process.env.OWNER_TIMEZONE || 'America/Los_Angeles',
      slotMinutes: 30,
      days: {
        monday: ['10:00-12:00', '14:00-17:00'],
        tuesday: ['10:00-12:00', '14:00-17:00'],
        wednesday: ['10:00-12:00', '14:00-17:00'],
        thursday: ['10:00-12:00', '14:00-17:00'],
        friday: ['10:00-12:00', '15:00-17:00'],
      },
    },
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'admin',
    PORT: parseInt(process.env.PORT || '3000'),
  };
}

// Environment variables ALWAYS override secrets.js (for deployed environments)
if (process.env.GEMINI_API_KEY) secrets.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (process.env.EMAIL_USER) secrets.EMAIL_USER = process.env.EMAIL_USER;
if (process.env.EMAIL_PASS) secrets.EMAIL_PASS = process.env.EMAIL_PASS;
if (process.env.OWNER_EMAIL) secrets.OWNER_EMAIL = process.env.OWNER_EMAIL;
if (process.env.OWNER_LINKEDIN) secrets.OWNER_LINKEDIN = process.env.OWNER_LINKEDIN;
if (process.env.DASHBOARD_PASSWORD) secrets.DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
if (process.env.PORT) secrets.PORT = parseInt(process.env.PORT);

console.log('Config source:', process.env.GEMINI_API_KEY ? 'environment variables' : 'secrets.js');

// ── Express Setup ────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

const genAI = secrets.GEMINI_API_KEY ? new GoogleGenerativeAI(secrets.GEMINI_API_KEY) : null;
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Data Helpers ─────────────────────────────────────────────────────────────
function loadJSON(filename, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8'));
  } catch { return fallback; }
}
function saveJSON(filename, data) {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

// ── Siraj's Resume Context ──────────────────────────────────────────────────
const SIRAJ_CONTEXT = `
NAME: Siraj Patnam
TITLE: AI/ML Engineer
LOCATION: San Francisco, CA
PHONE: ${secrets.OWNER_PHONE || '+1 (314) 393-9371'}
EMAIL: ${secrets.OWNER_EMAIL}
LINKEDIN: ${secrets.OWNER_LINKEDIN}

SUMMARY:
AI/ML Engineer with 5+ years of experience building scalable machine learning systems, NLP pipelines,
and cloud-based production solutions. Strong expertise in recommendation systems, LLM-driven text
understanding (RAG, GPT, LLaMA), PyTorch, Transformers, and Python-based microservices. Proven track
record deploying real-time ML models and optimizing data pipelines for millions of users.

CURRENT ROLE — Perplexity AI, AI/ML Engineer (Jun 2024 – Present, San Francisco, CA):
- Designed and deployed LLM-powered AI systems for real-time Q&A, semantic search, conversational intelligence
- Built end-to-end RAG pipelines integrating FAISS & Pinecone vector databases with LLMs
- Fine-tuned LLMs using LoRA, PEFT, prompt engineering, instruction tuning
- Built multi-agent AI systems using LangChain and LlamaIndex
- Managed MLOps pipelines (MLflow, Docker, Kubernetes, Airflow, CI/CD)
- Designed low-latency inference systems (quantization, distillation, batching, caching)
- Integrated vector search & embedding models (OpenAI, Sentence Transformers)
- AWS/GCP: Lambda, S3, EC2, SageMaker, Vertex AI

PREVIOUS — Accenture, ML Engineer (Jun 2020 – Jul 2023, India):
- Architected ML ranking & recommendation systems (LTR, XGBoost, LightGBM)
- Built deep learning models (CNNs, LSTMs, BERT, RoBERTa) for NLP tasks
- Embedding-based representation learning (Word2Vec, FastText, Sentence Transformers)
- Big data: Hadoop, Spark, Hive, Presto (terabyte-scale)
- A/B testing frameworks with statistical hypothesis testing

SKILLS: Python, SQL, PyTorch, TensorFlow, Hugging Face, Scikit-learn, LangChain, LlamaIndex,
RAG, LLM Fine-Tuning (LoRA/PEFT), Multi-Agent Systems, Prompt Engineering, FAISS, Pinecone,
AWS (SageMaker, Lambda, EC2), GCP (Vertex AI, BigQuery), Docker, Kubernetes, MLflow, CI/CD,
FastAPI, Flask, Apache Spark, A/B Testing

CERTIFICATIONS:
- AWS Certified AI Practitioner
- AWS Certified Machine Learning - Specialty
- Google Advanced Data Analytics Specialization
- Accelerating End-to-End Data Science Workflows

EDUCATION: M.S. Computer Information Systems, Saint Louis University, USA
`;

// ── Gemini Tool Declarations (function calling) ────────────────────────────
const TOOL_DECLARATIONS = [
  {
    name: 'save_recruiter_info',
    description: 'Save or update recruiter/visitor contact details. Call this whenever someone shares their name, email, company, or the role they are hiring for.',
    parameters: {
      type: 'object',
      properties: {
        name:    { type: 'string', description: 'Full name' },
        email:   { type: 'string', description: 'Email address' },
        company: { type: 'string', description: 'Company or organization' },
        role:    { type: 'string', description: 'Role they are hiring for' },
        phone:   { type: 'string', description: 'Phone number' },
        notes:   { type: 'string', description: 'Additional context from the conversation' },
      },
      required: ['name'],
    },
  },
  {
    name: 'check_availability',
    description: "Check Siraj's calendar for available meeting slots. Call this when someone wants to schedule a call or asks about availability.",
    parameters: {
      type: 'object',
      properties: {
        preferred_date: { type: 'string', description: 'Preferred date in YYYY-MM-DD format. Leave empty to see the next 5 business days.' },
      },
    },
  },
  {
    name: 'schedule_meeting',
    description: 'Book a meeting/call with Siraj. Use after the visitor has chosen a time slot.',
    parameters: {
      type: 'object',
      properties: {
        date:             { type: 'string', description: 'Date in YYYY-MM-DD format' },
        time:             { type: 'string', description: 'Start time in HH:MM format (24h)' },
        duration_minutes: { type: 'number', description: 'Duration in minutes (default 30)' },
        recruiter_name:   { type: 'string', description: 'Recruiter/visitor name' },
        recruiter_email:  { type: 'string', description: 'Recruiter/visitor email for confirmation' },
        topic:            { type: 'string', description: 'Meeting topic or agenda' },
      },
      required: ['date', 'time', 'recruiter_name'],
    },
  },
  {
    name: 'send_email',
    description: 'Send an email on behalf of Siraj. Use for follow-ups, sharing information, or custom messages.',
    parameters: {
      type: 'object',
      properties: {
        to:      { type: 'string', description: 'Recipient email' },
        subject: { type: 'string', description: 'Email subject' },
        body:    { type: 'string', description: 'Email body (HTML supported)' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'get_resume_link',
    description: "Provide a download link for Siraj's resume. Use when someone asks for his resume or CV.",
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

// ── Tool Execution ──────────────────────────────────────────────────────────

async function executeTool(name, input) {
  switch (name) {
    case 'save_recruiter_info': return saveRecruiterInfo(input);
    case 'check_availability':  return checkAvailability(input);
    case 'schedule_meeting':    return scheduleMeeting(input);
    case 'send_email':          return sendEmailTool(input);
    case 'get_resume_link':     return { url: '/resume', note: 'Resume download link is ready.' };
    default: return { error: `Unknown tool: ${name}` };
  }
}

function saveRecruiterInfo(input) {
  const leads = loadJSON('leads.json', []);
  const idx = input.email
    ? leads.findIndex(l => l.email === input.email)
    : leads.findIndex(l => l.name === input.name);

  const now = new Date().toISOString();
  if (idx >= 0) {
    Object.keys(input).forEach(k => { if (input[k]) leads[idx][k] = input[k]; });
    leads[idx].updatedAt = now;
  } else {
    leads.push({ id: Date.now().toString(), ...input, createdAt: now, updatedAt: now });
  }
  saveJSON('leads.json', leads);
  return { success: true, message: `Contact info saved for ${input.name}.` };
}

function checkAvailability(input) {
  const config = secrets.AVAILABILITY || {
    timezone: 'America/Los_Angeles',
    slotMinutes: 30,
    days: {
      monday: ['10:00-12:00', '14:00-17:00'], tuesday: ['10:00-12:00', '14:00-17:00'],
      wednesday: ['10:00-12:00', '14:00-17:00'], thursday: ['10:00-12:00', '14:00-17:00'],
      friday: ['10:00-12:00', '15:00-17:00'],
    },
  };
  const meetings = loadJSON('meetings.json', []);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const slots = [];

  const startDate = input.preferred_date ? new Date(input.preferred_date + 'T00:00:00') : new Date();
  const daysToCheck = input.preferred_date ? 1 : 7;

  for (let d = 0; d < daysToCheck && slots.length < 20; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dayName = dayNames[date.getDay()];
    const ranges = config.days[dayName];
    if (!ranges) continue;

    const dateStr = date.toISOString().split('T')[0];

    for (const range of ranges) {
      const [startTime, endTime] = range.split('-');
      let [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let current = sh * 60 + sm;
      const end = eh * 60 + em;
      const slotLen = config.slotMinutes || 30;

      while (current + slotLen <= end) {
        const timeStr = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;
        const booked = meetings.some(m => m.date === dateStr && m.time === timeStr && m.status !== 'cancelled');
        if (!booked) {
          const endMin = current + slotLen;
          const endStr = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
          slots.push({ date: dateStr, time: timeStr, endTime: endStr });
        }
        current += slotLen;
      }
    }
  }

  return {
    timezone: config.timezone,
    slotDuration: `${config.slotMinutes || 30} minutes`,
    availableSlots: slots,
    message: slots.length > 0
      ? `Found ${slots.length} available slots.`
      : 'No available slots found for the requested period.',
  };
}

function scheduleMeeting(input) {
  const meetings = loadJSON('meetings.json', []);
  const existing = meetings.find(m => m.date === input.date && m.time === input.time && m.status !== 'cancelled');
  if (existing) {
    return { success: false, message: 'This time slot is already booked. Please choose another.' };
  }

  const meeting = {
    id: Date.now().toString(),
    date: input.date,
    time: input.time,
    duration: input.duration_minutes || 30,
    recruiterName: input.recruiter_name,
    recruiterEmail: input.recruiter_email || '',
    topic: input.topic || 'Career Discussion with Siraj Patnam',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  meetings.push(meeting);
  saveJSON('meetings.json', meetings);

  if (input.recruiter_email && secrets.EMAIL_USER && secrets.EMAIL_USER !== 'your-email@gmail.com') {
    const tz = secrets.OWNER_TIMEZONE || 'America/Los_Angeles';
    sendEmailTool({
      to: input.recruiter_email,
      subject: `Meeting Confirmed: ${meeting.topic}`,
      body: `
        <div style="font-family:system-ui,sans-serif;max-width:500px;">
          <h2 style="color:#00d4ff;">Meeting Confirmed</h2>
          <p>Hi ${input.recruiter_name},</p>
          <p>Your meeting with <strong>Siraj Patnam</strong> has been scheduled:</p>
          <table style="border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:6px 12px;color:#888;">Date</td><td style="padding:6px 12px;font-weight:600;">${meeting.date}</td></tr>
            <tr><td style="padding:6px 12px;color:#888;">Time</td><td style="padding:6px 12px;font-weight:600;">${meeting.time} (${tz})</td></tr>
            <tr><td style="padding:6px 12px;color:#888;">Duration</td><td style="padding:6px 12px;font-weight:600;">${meeting.duration} minutes</td></tr>
            <tr><td style="padding:6px 12px;color:#888;">Topic</td><td style="padding:6px 12px;font-weight:600;">${meeting.topic}</td></tr>
          </table>
          <p>Looking forward to connecting!</p>
          <p style="color:#888;">— Siraj's AI Assistant</p>
        </div>`,
    }).catch(() => {});

    sendEmailTool({
      to: secrets.OWNER_EMAIL,
      subject: `New Meeting Booked: ${input.recruiter_name}${input.recruiter_email ? ' (' + input.recruiter_email + ')' : ''}`,
      body: `
        <div style="font-family:system-ui,sans-serif;max-width:500px;">
          <h2>New Meeting Scheduled</h2>
          <table style="border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:6px 12px;color:#888;">Recruiter</td><td style="padding:6px 12px;font-weight:600;">${input.recruiter_name}</td></tr>
            <tr><td style="padding:6px 12px;color:#888;">Email</td><td style="padding:6px 12px;font-weight:600;">${input.recruiter_email || 'N/A'}</td></tr>
            <tr><td style="padding:6px 12px;color:#888;">Date</td><td style="padding:6px 12px;font-weight:600;">${meeting.date}</td></tr>
            <tr><td style="padding:6px 12px;color:#888;">Time</td><td style="padding:6px 12px;font-weight:600;">${meeting.time}</td></tr>
            <tr><td style="padding:6px 12px;color:#888;">Topic</td><td style="padding:6px 12px;font-weight:600;">${meeting.topic}</td></tr>
          </table>
        </div>`,
    }).catch(() => {});
  }

  return { success: true, meeting, message: `Meeting scheduled for ${meeting.date} at ${meeting.time}.` };
}

async function sendEmailTool(input) {
  if (!secrets.EMAIL_USER || secrets.EMAIL_USER === 'your-email@gmail.com') {
    return { success: false, message: 'Email not configured yet. Ask Siraj to set up email credentials in secrets.js.' };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: secrets.EMAIL_HOST || 'smtp.gmail.com',
      port: secrets.EMAIL_PORT || 587,
      secure: false,
      auth: { user: secrets.EMAIL_USER, pass: secrets.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"${secrets.OWNER_NAME}" <${secrets.EMAIL_USER}>`,
      to: input.to,
      subject: input.subject,
      html: input.body,
    });
    return { success: true, message: `Email sent to ${input.to}.` };
  } catch (err) {
    console.error('Email error:', err.message);
    return { success: false, message: 'Failed to send email. The email service may not be configured correctly.' };
  }
}

// ── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Siraj Patnam's personal AI career assistant, embedded on his portfolio website.
You interact with recruiters, hiring managers, and visitors to help them learn about Siraj and facilitate connections.

YOUR CAPABILITIES (use the tools!):
1. Answer questions about Siraj's experience, skills, and background using the context below
2. SAVE recruiter details whenever someone shares their name/email/company (use save_recruiter_info)
3. CHECK calendar availability when someone wants to schedule (use check_availability)
4. BOOK meetings after confirming a time slot (use schedule_meeting)
5. SEND emails for confirmations or follow-ups (use send_email)
6. SHARE Siraj's resume when asked (use get_resume_link)

PERSONALITY:
- Professional yet warm and conversational
- Enthusiastic about Siraj's work, especially his current role at Perplexity AI
- Proactive: gently ask for their details and offer to schedule calls
- Concise: 2-4 sentences for simple questions, longer only when needed

KEY BEHAVIORS:
- When someone introduces themselves or mentions their company/role → immediately call save_recruiter_info
- When scheduling is discussed → call check_availability first, present 3-5 good options, then book with schedule_meeting
- After booking → the system auto-sends confirmation emails, so just confirm verbally
- When presenting time slots, format them nicely (e.g. "Monday Jan 15 at 2:00 PM PST")
- Always refer to times in the configured timezone (Pacific Time)

NEVER:
- Invent skills or experiences Siraj doesn't have
- Share personal information beyond what's in the resume context
- Be pushy — be helpful and professional

SIRAJ'S FULL BACKGROUND:
${SIRAJ_CONTEXT}`;

// ── Agentic Chat Endpoint (SSE with tool-calling loop) ──────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, sessionId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }
  if (!genAI) {
    return res.status(500).json({ error: 'Gemini API key not configured. Set GEMINI_API_KEY environment variable.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    });

    // Convert messages to Gemini format
    const geminiHistory = [];
    for (const msg of messages.slice(0, -1)) {
      geminiHistory.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const chat = model.startChat({ history: geminiHistory });
    const lastMessage = messages[messages.length - 1].content;

    let iterations = 0;
    let currentInput = lastMessage;

    while (iterations < 6) {
      iterations++;

      const result = await chat.sendMessage(currentInput);
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts || [];

      // Extract text and function calls
      let textContent = '';
      const functionCalls = [];

      for (const part of parts) {
        if (part.text) {
          textContent += part.text;
        }
        if (part.functionCall) {
          functionCalls.push(part.functionCall);
        }
      }

      // Stream any text
      if (textContent.trim()) {
        res.write(`data: ${JSON.stringify({ type: 'text', content: textContent })}\n\n`);
      }

      // If no function calls, we're done
      if (functionCalls.length === 0) break;

      // Execute tools and collect responses
      const functionResponses = [];
      for (const fc of functionCalls) {
        const toolLabel = {
          save_recruiter_info: 'Saving contact details',
          check_availability: 'Checking calendar',
          schedule_meeting: 'Booking meeting',
          send_email: 'Sending email',
          get_resume_link: 'Preparing resume',
        }[fc.name] || fc.name;

        res.write(`data: ${JSON.stringify({ type: 'tool_start', tool: fc.name, label: toolLabel })}\n\n`);
        const toolResult = await executeTool(fc.name, fc.args || {});
        res.write(`data: ${JSON.stringify({ type: 'tool_done', tool: fc.name, label: toolLabel, success: toolResult.success !== false })}\n\n`);

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: toolResult,
          },
        });
      }

      // Send tool results back to Gemini for next iteration
      currentInput = functionResponses;
    }

    // Save conversation
    if (sessionId) {
      const convos = loadJSON('conversations.json', []);
      const idx = convos.findIndex(c => c.sessionId === sessionId);
      const entry = { sessionId, messages, updatedAt: new Date().toISOString() };
      if (idx >= 0) convos[idx] = entry; else convos.push(entry);
      saveJSON('conversations.json', convos);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err.message, err.stack);
    const debugMsg = process.env.NODE_ENV === 'production'
      ? `AI service error: ${err.message}`
      : `AI service error: ${err.message}`;
    res.write(`data: ${JSON.stringify({ type: 'error', content: debugMsg })}\n\n`);
    res.end();
  }
});

// ── Resume Download ─────────────────────────────────────────────────────────
app.get('/resume', (req, res) => {
  const resumePath = path.join(__dirname, 'Siraj_Patnam_Resume.pdf');
  if (fs.existsSync(resumePath)) {
    res.download(resumePath);
  } else {
    res.status(404).send('Resume file not found. Please add Siraj_Patnam_Resume.pdf to the project root.');
  }
});

// ── Dashboard API (password protected) ──────────────────────────────────────
function authDashboard(req, res, next) {
  const pw = req.headers['x-dashboard-password'] || req.query.pw;
  if (pw !== secrets.DASHBOARD_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/api/dashboard/leads', authDashboard, (req, res) => {
  res.json(loadJSON('leads.json', []));
});
app.get('/api/dashboard/meetings', authDashboard, (req, res) => {
  res.json(loadJSON('meetings.json', []));
});
app.get('/api/dashboard/conversations', authDashboard, (req, res) => {
  res.json(loadJSON('conversations.json', []));
});
app.get('/api/dashboard/stats', authDashboard, (req, res) => {
  const leads = loadJSON('leads.json', []);
  const meetings = loadJSON('meetings.json', []);
  const convos = loadJSON('conversations.json', []);
  res.json({
    totalLeads: leads.length,
    totalMeetings: meetings.length,
    totalConversations: convos.length,
    upcomingMeetings: meetings.filter(m => m.status === 'confirmed' && m.date >= new Date().toISOString().split('T')[0]).length,
  });
});

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', gemini: !!genAI, timestamp: new Date().toISOString() });
});

// ── Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || secrets.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`\n  Portfolio running  →  http://${HOST}:${PORT}`);
  console.log(`  Dashboard         →  http://${HOST}:${PORT}/dashboard.html`);
  console.log(`  Gemini AI         →  ${genAI ? 'configured' : 'NOT configured — set GEMINI_API_KEY'}`);
  console.log('');
});
