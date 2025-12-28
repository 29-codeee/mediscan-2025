const { Resend } = require('resend');
const fs = require('fs');

// Load env vars
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const resend = new Resend(envVars.RESEND_API_KEY);

async function sendTestEmail() {
  console.log('Sending test email to tuppad.shreya29@gmail.com...');
  try {
    const { data, error } = await resend.emails.send({
      from: 'MediScan <onboarding@resend.dev>',
      to: ['tuppad.shreya29@gmail.com'], // The ONLY allowed email in free tier
      subject: 'MediScan Test Email',
      html: '<strong>It works!</strong>',
    });

    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

sendTestEmail();