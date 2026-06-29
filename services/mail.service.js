const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  tls: {
    rejectUnauthorized: false,
  },
});


async function sendTestMail(email) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Test HOMIETICKET",
    html: `
      <h2>HOMIETICKET</h2>
      <p>Gửi mail thành công 🎉</p>
    `,
  });
}

module.exports = {
  sendTestMail,
};