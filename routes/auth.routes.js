
const express = require("express");

const router = express.Router();

const db = require("../db");


// REGISTER ORGANIZER
router.post("/organizer/register", (req, res) => {

  const {
    organization_name,
    email,
    phone,
    password,
  } = req.body;

  const sql = `
    INSERT INTO users
    (
      name,
      email,
      phone,
      password,
      role,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      organization_name,
      email,
      phone,
      password,
      "ORGANIZER",
      "ACTIVE",
    ],
    (err, result) => {

      if (err) {

        return res.status(500).json(err);

      }

      res.json({
        message: "Đăng ký organizer thành công",
      });

    }
  );

});

module.exports = router;
