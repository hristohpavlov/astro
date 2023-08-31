const mail = require('@sendgrid/mail');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const cors = require('cors');
const {SENDGRID_API_KEY} = process.env;

const ORIGINS = ['https://hpavlov.work', 'https://www.hpavlov.work'];
const MAX_EMAIL_LENGTH = 512;
const MAX_MESSAGE_LENGTH = 4096;
const EMAIL = 'hristohpavlov@gmail.com';
const FROM_EMAIL = 'Portfolio.Inquiry@hpavlov.work';
const EMAIL_PATTERN = /(.+)@(.+){2,}\.(.+){2,}/;

mail.setApiKey(SENDGRID_API_KEY);

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

cors({
  origin: (origin, callback) => {
    if (!ORIGINS.includes(origin)) {
      return callback(
        new Error(`Not allowed by CORS. Origin must be: ${ORIGINS.join(' or ')}`)
      );
    }

    return callback(null, true);
  },
});

export default async function handler(req, res){
  try{
    const email = DOMPurify.sanitize(req.body.email);
    const message = DOMPurify.sanitize(req.body.message);
    const name = DOMPurify.sanitize(req.body.name);
    // Validate email request
    if (!email || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Please enter a message' });
    }

    if (email.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({
        error: `Please enter an email fewer than ${MAX_EMAIL_LENGTH} characters`,
      });
    }

    if (!name) {
      return res.status(400).json({ error: 'Please enter a message' });
    }

    if (name.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({
        error: `Please enter an email fewer than ${MAX_EMAIL_LENGTH} characters`,
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Please enter a message fewer than ${MAX_MESSAGE_LENGTH} characters`,
      });
    }

  const data = {
    to: EMAIL,
    from: FROM_EMAIL,
    subject: `[NEW] Email from ${name}`,
    text: message,
    html: `
    <p><strong>${email}</strong></p>
    <p>${message}</p>`
  };
  await mail.send(data);
  return res.status(200).json({ message: 'Message sent successfully' });
} catch(error) {
  console.error('Rejected', error);
  return res.status(500).json({ error: 'Message rejected' });
}
}