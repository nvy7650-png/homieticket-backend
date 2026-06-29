const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,

  logger: true,
  debug: true,
});

async function sendTestMail(email) {
  await transporter.sendMail({
    from: '"HomieTicket" <violet200204@gmail.com>',
    to: email,

    subject: "HOMIETICKET TEST",

    html: `
      <h2>🎉 HOMIETICKET</h2>
      <p>Gửi mail thành công bằng Brevo.</p>
    `,
  });
}

module.exports = {
  sendTestMail,
};