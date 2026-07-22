exports.handler = async (event) => {
  const escapeHtml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Missing RESEND_API_KEY' })
    };
  }

  let payload;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const name = (payload.name || '').toString().trim();
  const email = (payload.email || '').toString().trim();
  const phone = (payload.phone || '').toString().trim();
  const message = (payload.message || '').toString().trim();

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

  if (!name || !email || !phone || !message) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'All fields are required' })
    };
  }

  const subject = `New GreenEstates contact from ${name}`;
  const textBody = [
    'New contact form submission',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    '',
    'Message:',
    message
  ].join('\n');

  const htmlBody = `
    <h2>New contact form submission</h2>
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>Email:</strong> ${safeEmail}</p>
    <p><strong>Phone:</strong> ${safePhone}</p>
    <p><strong>Message:</strong></p>
    <p>${safeMessage}</p>
  `;

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'GreenEstates <onboarding@resend.dev>',
        to: ['greenestates2026@outlook.com'],
        subject,
        text: textBody,
        html: htmlBody,
        reply_to: email
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      return {
        statusCode: 502,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Failed to send email', details: errorText })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Email sent successfully' })
    };
  } catch (error) {
  console.error("ERROR:", error);

  return {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      error: error.message,
      stack: error.stack
    })
  };
}
};
