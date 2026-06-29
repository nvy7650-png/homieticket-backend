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
      message: "Lỗi gửi mail",
    });
  }
});

module.exports = router;