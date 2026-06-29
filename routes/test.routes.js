router.get("/mail", async (req, res) => {
  try {

    await sendTestMail(
      "nvy7650@gmail.com"
    );

    res.json({
      message: "Gửi mail thành công"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: err.message
    });

  }
});