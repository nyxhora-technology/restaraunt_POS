const { Resend } = require("resend");
const config = require("./config");

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

const sendEmail = async ({ to, subject, html }) => {
  if (!config.staffEmailInvitesEnabled) {
    console.warn(`Email skipped (${subject} -> ${to}): STAFF_EMAIL_INVITES_ENABLED is false`);
    return { skipped: true };
  }

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
