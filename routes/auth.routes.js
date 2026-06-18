const express = require("express");

const router = express.Router();

const db = require("../db");


// =============================
// REGISTER USER
// =============================
router.post("/register", (req, res) => {

  const {
    name,
    email,
    phone,
    password,
  } = req.body;

  // CHECK EMAIL / PHONE
  const checkSql = `
    SELECT *
    FROM users
    WHERE email = ?
    OR phone = ?
  `;

  db.query(

    checkSql,

    [email, phone],

    (checkErr, checkResult) => {

      if (checkErr) {

        return res.status(500).json({
          message: "Server error",
        });

      }

      // EMAIL EXISTS
      const emailExists =
        checkResult.find(
          (user) =>
            user.email === email
        );

      if (emailExists) {

        return res.status(400).json({
          message: "Email đã tồn tại",
        });

      }

      // PHONE EXISTS
      const phoneExists =
        checkResult.find(
          (user) =>
            user.phone === phone
        );

      if (phoneExists) {

        return res.status(400).json({
          message:
            "Số điện thoại đã tồn tại",
        });

      }

      // INSERT USER
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
          name,
          email,
          phone,
          password,
          "USER",
          "ACTIVE",
        ],

        (err, result) => {

          if (err) {

            return res.status(500).json({
              message:
                "Đăng ký thất bại",
            });

          }

          res.json({

            message:
              "Đăng ký thành công",

            user: {

              id:
                result.insertId,

              name,
              email,

              role:
                "USER",

            },

          });

        }

      );

    }

  );

});


// =============================
// REGISTER ORGANIZER
// =============================
router.post("/organizer/register", (req, res) => {

  const {
    organization_name,
    email,
    phone,
    password,
  } = req.body;

  // CHECK EMAIL / PHONE
  const checkSql = `
    SELECT *
    FROM users
    WHERE email = ?
    OR phone = ?
  `;

  db.query(

    checkSql,

    [email, phone],

    (checkErr, checkResult) => {

      if (checkErr) {

        return res.status(500).json({
          message: "Server error",
        });

      }

      // EMAIL EXISTS
      const emailExists =
        checkResult.find(
          (user) =>
            user.email === email
        );

      if (emailExists) {

        return res.status(400).json({
          message:
            "Email đã tồn tại",
        });

      }

      // PHONE EXISTS
      const phoneExists =
        checkResult.find(
          (user) =>
            user.phone === phone
        );

      if (phoneExists) {

        return res.status(400).json({
          message:
            "Số điện thoại đã tồn tại",
        });

      }

      // INSERT ORGANIZER
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

            return res.status(500).json({
              message:
                "Đăng ký organizer thất bại",
            });

          }

          res.json({

            message:
              "Đăng ký organizer thành công",

            user: {

              id:
                result.insertId,

              name:
                organization_name,

              email,

              role:
                "ORGANIZER",

            },

          });

        }

      );

    }

  );

});


// =============================
// LOGIN
// =============================
router.post("/login", (req, res) => {

  const {
    email,
    password,
  } = req.body;

  // FIND USER
  const sql = `
    SELECT
      id,
      name,
      email,
      password,
      role,
      status
    FROM users
    WHERE email = ?
  `;

  db.query(

    sql,

    [email],

    (err, results) => {

      if (err) {

        return res.status(500).json({
          message: "Server error",
        });

      }

      // EMAIL NOT FOUND
      if (
        results.length === 0
      ) {

        return res.status(404).json({
          message:
            "Email không tồn tại",
        });

      }

      const user =
        results[0];

      // ACCOUNT LOCKED
if (
  user.status === "BLOCKED"
) {

  return res.status(403).json({
    message:
      "Tài khoản đã bị khóa",
  });

}

// WRONG PASSWORD
if (
  user.password !==
  password
) {

  return res.status(401).json({
    message:
      "Sai mật khẩu",
  });

}

      // REMOVE PASSWORD
      delete user.password;

      // SUCCESS
      res.json({

        message:
          "Đăng nhập thành công",

        user,

      });

    }

  );

});
// =============================
// BLOCK USER
// =============================
router.put(
  "/users/:id/block",
  (req, res) => {

    db.query(
      `
      UPDATE users
      SET status='BLOCKED'
      WHERE id=?
      `,
      [req.params.id],
      (err) => {

        if (err) {

          return res
            .status(500)
            .json({
              message:
                "Lỗi khóa tài khoản",
            });

        }

        res.json({
          message:
            "Đã khóa tài khoản",
        });

      }
    );

  }
);

// =============================
// UNBLOCK USER
// =============================
router.put(
  "/users/:id/unblock",
  (req, res) => {

    db.query(
      `
      UPDATE users
      SET status='ACTIVE'
      WHERE id=?
      `,
      [req.params.id],
      (err) => {

        if (err) {

          return res
            .status(500)
            .json({
              message:
                "Lỗi mở khóa",
            });

        }

        res.json({
          message:
            "Đã mở khóa",
        });

      }
    );

  }
);
// =============================
// GET ALL USERS
// =============================
router.get(
  "/users",
  (req, res) => {

    db.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        status
      FROM users
      ORDER BY id DESC
      `,
      (err, results) => {

        if (err) {

          return res
            .status(500)
            .json({
              message:
                "Server error",
            });

        }

        res.json(results);

      }
    );

  }
);

// =============================
// GET USER DETAIL
// =============================
router.get(
  "/users/:id",
  (req, res) => {

    db.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        role,
        status,
        created_at
      FROM users
      WHERE id = ?
      `,
      [req.params.id],
      (err, results) => {

        if (err) {

          return res
            .status(500)
            .json({
              message:
                "Server error",
            });

        }

        if (
          results.length === 0
        ) {

          return res
            .status(404)
            .json({
              message:
                "Không tìm thấy user",
            });

        }

        res.json(
          results[0]
        );

      }
    );

  }
);
module.exports = router;