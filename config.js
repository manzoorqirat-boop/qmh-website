// ── HOSPITAL WEBSITE SETTINGS ────────────────────────────────────────────────
// The only file you normally edit. The hospital's name, tagline, phone, address, WhatsApp number, map link and logo are
// read from the hospital system (Settings → Hospital profile) so they stay in one place; whatever is empty there falls
// back to the values below. Everything here is public — never put a password or key in this file.
window.HOSPITAL_SITE = {
  // ── connection ──
  slug: 'qmh',                                                     // the hospital code used on the login page
  apiBase: 'https://hospitalappbackend.qmsofts.com',        // the hospital system's address (the backend)
  appUrl: 'https://hospitalapp.qmsofts.com',                                                      // where staff / patients log in, e.g. 'https://app.yourhospital.com'
                                                                   // (empty = the Login buttons say login is not switched on yet)

  // ── fallbacks, used when Settings has no value ──
  name: 'QMH Hospital',
  tagline: 'Caring for you and your family, every day.',
  phone: '',                // e.g. '+91 98765 43210'
  whatsapp: '',             // with country code, digits only, e.g. '919876543210'
  email: '',
  address: '',
  mapsUrl: '',              // a Google Maps link to the hospital
  emergencyPhone: '',       // shown as "Emergency 24×7" when set
  hours: [                  // shown on the home page and the contact section
    ['Mon – Sat', '9:00 am – 5:00 pm'],
    ['Sunday', 'Emergency only'],
  ],

  // ── appearance ──
  colors: { navy: '#0f1a3a', navy2: '#1b2a5c', gold: '#c9a24b', soft: '#f5f7fc' },
  heroImage: '',            // optional: a picture URL for the top of the home page (leave empty for the plain design)

  // ── content (edit freely) ──
  heroTitle: 'Your health, in trusted hands.',
  heroText: 'Experienced doctors, modern care and a team that listens. Book your appointment online in a minute.',
  highlights: ['Experienced doctors', 'Clean, caring wards', 'Clear, honest billing'],
  departments: [
    { icon: '🩺', name: 'General Medicine', text: 'Fever, infections, diabetes, blood pressure and everyday health problems.' },
    { icon: '🧒', name: 'Paediatrics', text: 'Care for babies, children and teenagers, including vaccination.' },
    { icon: '🦴', name: 'Orthopaedics', text: 'Bones, joints, fractures, sports injuries and back pain.' },
    { icon: '🤰', name: 'Women\'s Health', text: 'Pregnancy care, check-ups and women\'s health concerns.' },
    { icon: '🧪', name: 'Laboratory', text: 'Blood tests, urine tests and health check packages with quick reports.' },
    { icon: '💊', name: 'Pharmacy', text: 'Genuine medicines at the hospital, right after your consultation.' },
  ],
  why: [
    { icon: '👩‍⚕️', title: 'Experienced doctors', text: 'Qualified specialists who take time to explain.' },
    { icon: '🛏️', title: 'Comfortable inpatient care', text: 'Clean wards, attentive nursing and a private room option.' },
    { icon: '🧾', title: 'Clear billing', text: 'Itemised bills and printed receipts, with no surprises.' },
    { icon: '📱', title: 'Easy appointments', text: 'Book online, get a confirmation, and skip the queue.' },
  ],
  stats: [],                // e.g. [['15+', 'Years of service'], ['40,000+', 'Patients treated']]
  testimonials: [],         // e.g. [{ quote: 'The doctors were kind and clear.', name: 'R. Sharma', role: 'Patient' }]
  faqs: [
    { q: 'How do I book an appointment?', a: 'Press "Book appointment", choose your doctor, pick a day and time, and enter your name and mobile number. You will get a confirmation.' },
    { q: 'Do I have to pay online?', a: 'No. You pay the consultation fee at the hospital reception when you arrive.' },
    { q: 'What should I bring?', a: 'A photo ID, any earlier reports or prescriptions, and the list of medicines you take.' },
    { q: 'Can I change or cancel my appointment?', a: 'Yes. Please call the hospital reception and we will change it for you.' },
  ],
};
