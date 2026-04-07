// ============================================================
//  SECRETS — Fill in your API keys before running the server
//  Then run:  node server.js
// ============================================================

module.exports = {
  // ── Required: Anthropic API Key (powers the AI assistant) ──
  ANTHROPIC_API_KEY: 'your-anthropic-api-key-here',

  // ── Email (Gmail SMTP — use an App Password, not your regular password) ──
  // To generate an App Password: Google Account → Security → 2-Step Verification → App Passwords
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: 587,
  EMAIL_USER: 'your-email@gmail.com',
  EMAIL_PASS: 'your-gmail-app-password',

  // ── Portfolio Owner Info ──
  OWNER_NAME: 'Siraj Patnam',
  OWNER_EMAIL: 'your-email@gmail.com',
  OWNER_PHONE: '+1 (314) 393-9371',
  OWNER_LINKEDIN: 'https://linkedin.com/in/siraj-patnam',
  OWNER_TIMEZONE: 'America/Los_Angeles',

  // ── Calendar Availability (when you're free for calls) ──
  AVAILABILITY: {
    timezone: 'America/Los_Angeles',
    slotMinutes: 30,
    days: {
      monday:    ['10:00-12:00', '14:00-17:00'],
      tuesday:   ['10:00-12:00', '14:00-17:00'],
      wednesday: ['10:00-12:00', '14:00-17:00'],
      thursday:  ['10:00-12:00', '14:00-17:00'],
      friday:    ['10:00-12:00', '15:00-17:00'],
    },
  },

  // ── Private Dashboard (view leads, meetings, conversations) ──
  DASHBOARD_PASSWORD: 'change-this-password',

  // ── Server ──
  PORT: 3000,
};
