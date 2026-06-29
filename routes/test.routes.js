const express = require("express");
const router = express.Router();

const {
  sendTestMail,
} = require("../services/mail.service");

router.get("/mail", async (req, res) => {
  try {

    await sendTestMail(
      "nvy7650@gmail.com"
    );

    res.json({
      message: "Gửi mail thành công",
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: err.message,
    });

  }
});
router.get("/mail", async (req, res) => {
  try {

    console.log("HOST:", process.env.SMTP_HOST);
    console.log("PORT:", process.env.SMTP_PORT);
    console.log("USER:", process.env.SMTP_USER);
    console.log("PASS:", !!process.env.SMTP_PASS);

    await sendTestMail(
      "violet200204@gmail.com"
    );

    res.json({
      message: "OK"
    });

  } catch (err) {

    console.log("FULL ERROR:");
    console.log(err);

    res.status(500).json({
      error: err.message
    });
  }
});
module.exports = router;