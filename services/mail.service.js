const nodemailer = require("nodemailer");

const dns = require("dns");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  lookup(hostname, options, callback) {
    return dns.lookup(
      hostname,
      { family: 4 },
      callback
    );
  },

  connectionTimeout: 10000,
});


async function sendTestMail(email) {
  await transporter.sendMail({
    from: {
  name: "HOMIETICKET",
  address: "violet200204@gmail.com",
},
    to: email,

    subject: "HOMIETICKET TEST",

    html: `
      <h2>🎉 HOMIETICKET</h2>
      <p>Gửi mail thành công bằng Brevo.</p>
    `,
  });
}

async function sendTicketMail(
  email,
  orderId,
  tickets
) {

  const ticketHtml =
    tickets.map(ticket => `
      <li>
        ${ticket.ticket_code}
      </li>
    `).join("");

  await transporter.sendMail({

    from: {
      name: "HOMIETICKET",
      address: "violet200204@gmail.com",
    },

    to: email,

    subject: `Vé điện tử #${orderId}`,

    html: `
      <h2>🎫 HOMIETICKET</h2>

      <p>
        Thanh toán thành công.
      </p>

      <p>
        Mã đơn:
        <b>#${orderId}</b>
      </p>

      <h3>Vé của bạn:</h3>

      <ul>
        ${ticketHtml}
      </ul>

      <p>
        Cảm ơn bạn đã sử dụng HOMIETICKET.
      </p>
    `,
  });

}

async function sendOTP(
  email,
  otp
) {

  await transporter.sendMail({

    from: {
      name: "HOMIETICKET",
      address:
        "violet200204@gmail.com",
    },

    to: email,

    subject:
      "Mã xác thực đặt lại mật khẩu",

    html: `
      <div
        style="
          font-family:Arial;
          max-width:600px;
          margin:auto;
        "
      >

        <h2
          style="
            color:#0ea5e9;
          "
        >

          HOMIETICKET

        </h2>

        <p>

          Bạn vừa yêu cầu
          đặt lại mật khẩu.

        </p>

        <p>

          Mã OTP của bạn là:

        </p>

        <h1
          style="
            letter-spacing:8px;
            color:#2563eb;
          "
        >

          ${otp}

        </h1>

        <p>

          OTP có hiệu lực
          trong
          <b>5 phút</b>.

        </p>

        <p>

          Nếu bạn không
          thực hiện yêu cầu này,
          hãy bỏ qua email.

        </p>

      </div>
    `,

  });

}

module.exports = {

  sendTestMail,

  sendTicketMail,

  sendOTP,

};