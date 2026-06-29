const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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