
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

  const checkSql = `
  SELECT * FROM users
  WHERE email = ? OR phone = ?
`;

db.query(
  checkSql,
  [email, phone],
  (checkErr, checkResult) => {

    if (checkErr) {
      return res.status(500).json(checkErr);
    }

    if (checkResult.length > 0) {

      return res.status(400).json({
        message: "Email hoặc số điện thoại đã tồn tại",
      });

    }

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

  }
);

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


});

// LOGIN
router.post("/login", (req, res) => {

  const {
    email,
    password,
  } = req.body;

  const sql = `
    SELECT *
    FROM users
    WHERE email = ?
    AND password = ?
  `;

  db.query(
    sql,
    [email, password],
    (err, results) => {

      if (err) {
        return res.status(500).json(err);
      }

      if (results.length === 0) {

        return res.status(401).json({
          message: "Sai email hoặc mật khẩu",
        });

      }

      res.json({
        message: "Đăng nhập thành công",
        user: results[0],
      });

    }
  );

});

module.exports = router;
