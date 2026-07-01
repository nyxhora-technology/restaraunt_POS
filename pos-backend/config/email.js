const { Resend } = require("resend");
const config = require("./config");

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

const sendEmail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn(`Email skipped (${subject} -> ${to}): RESEND_API_KEY is not configured`);
    return { skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: config.resendFrom,
    to,
    subject,
    html,
  });

  if (error) throw new Error(error.message || "Email delivery failed");
  return data;
};

module.exports = { sendEmail };
