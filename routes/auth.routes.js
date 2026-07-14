const express = require("express");

const router = express.Router();

const db = require("../db");
const {
  sendOTP,
} = require("../services/mail.service");

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

const userSql = `
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
`;

db.query(
  userSql,
  [req.params.id],
  (err, userResult) => {

    if (err) {
      return res.status(500).json({
        message: "Server error",
      });
    }

    if (!userResult.length) {
      return res.status(404).json({
        message: "Không tìm thấy user",
      });
    }

    const user = userResult[0];

    const statSql = `
  SELECT

    COUNT(*) AS total_orders,

    COALESCE(
      SUM(
        CASE
          WHEN status = 'PAID'
          THEN total_price
          ELSE 0
        END
      ),
      0
    ) AS total_spent

  FROM orders

  WHERE user_id = ?
`;
    if (user.role === "ORGANIZER") {

  const organizerStatSql = `
    SELECT

      COUNT(*) AS total_events,

      SUM(
        CASE
          WHEN status = 'APPROVED'
          THEN 1
          ELSE 0
        END
      ) AS approved_events,

      SUM(
        CASE
          WHEN status = 'PENDING'
          THEN 1
          ELSE 0
        END
      ) AS pending_events

    FROM events

    WHERE organizer_id = ?
  `;

  db.query(
    organizerStatSql,
    [req.params.id],
    (err, statResult) => {

      if (err) {

        return res.status(500).json({
          message: "Server error",
        });

      }

      const eventSql = `
        SELECT
          id,
          title,
          status,
          created_at
        FROM events
        WHERE organizer_id = ?
        ORDER BY created_at DESC
      `;

      db.query(
        eventSql,
        [req.params.id],
        (err, events) => {

          if (err) {

            return res.status(500).json({
              message: "Server error",
            });

          }

          const ticketSalesSql = `
  SELECT

    e.id,
    e.title,

    COUNT(t.id)
    AS total_tickets

  FROM events e

  LEFT JOIN tickets t
  ON e.id = t.event_id

  WHERE e.organizer_id = ?

  GROUP BY e.id

  ORDER BY total_tickets DESC
`;

db.query(
  ticketSalesSql,
  [req.params.id],
  (err, ticketSales) => {

    if (err) {

      return res.status(500).json({
        message: "Server error",
      });

    }

    const revenueSql = `
      SELECT

        e.id,
        e.title,

        COALESCE(
          SUM(
            CASE
              WHEN o.status='PAID'
              THEN o.total_price
              ELSE 0
            END
          ),
          0
        ) AS revenue

      FROM events e

      LEFT JOIN orders o
      ON e.id = o.event_id

      WHERE e.organizer_id = ?

      GROUP BY e.id

      ORDER BY revenue DESC
    `;

    db.query(
      revenueSql,
      [req.params.id],
      (err, revenues) => {

        if (err) {

          return res.status(500).json({
            message: "Server error",
          });

        }

        res.json({

          ...user,

          total_events:
            statResult[0].total_events || 0,

          approved_events:
            statResult[0].approved_events || 0,

          pending_events:
            statResult[0].pending_events || 0,

          events,

          ticketSales,

          revenues

        });

      }
    );

  }
);

        }
      );

    }
  );

  return;
}


    db.query(
      statSql,
      [req.params.id],
      (err, statResult) => {

        if (err) {
          return res.status(500).json({
            message: "Server error",
          });
        }

        const ticketSql = `
          SELECT
            COUNT(*) AS total_tickets
          FROM tickets
          WHERE user_id = ?
        `;

        db.query(
          ticketSql,
          [req.params.id],
          (err, ticketResult) => {

            if (err) {
              return res.status(500).json({
                message: "Server error",
              });
            }

            const orderSql = `
              SELECT
                o.id,
                o.total_price,
                o.status,
                o.created_at,
                e.title AS event_title
              FROM orders o
              LEFT JOIN events e
              ON o.event_id = e.id
              WHERE o.user_id = ?
              ORDER BY o.created_at DESC
            `;

            db.query(
              orderSql,
              [req.params.id],
              (err, orders) => {

                if (err) {
                  return res.status(500).json({
                    message: "Server error",
                  });
                }

                const ticketListSql = `
  SELECT
    t.id,
    t.ticket_code,
    t.status,

    e.title AS event_title,

    s.seat_code

  FROM tickets t

  LEFT JOIN events e
  ON t.event_id = e.id

  LEFT JOIN seats s
  ON t.seat_id = s.id

  WHERE t.user_id = ?

  ORDER BY t.id DESC
`;

db.query(
  ticketListSql,
  [req.params.id],
  (err, tickets) => {

    if (err) {

      return res.status(500).json({
        message: "Server error",
      });

    }

    res.json({

      ...user,

      total_orders:
        statResult[0].total_orders,

      total_spent:
        statResult[0].total_spent,

      total_tickets:
        ticketResult[0].total_tickets,

      orders,

      tickets,

    });

  }
);

              }
            );

          }
        );

      }
    );

  }
);

}
);

// =============================
// GET PROFILE
// =============================
router.get(
  "/profile/:id",
  (req, res) => {

    db.query(
      `
      SELECT
        id,
        name,
        email,
        phone
      FROM users
      WHERE id = ?
      `,
      [req.params.id],
      (err, result) => {

        if (err) {

          return res.status(500).json({
            message: "Server error",
          });

        }

        if (!result.length) {

          return res.status(404).json({
            message:
              "Không tìm thấy tài khoản",
          });

        }

        res.json(
          result[0]
        );

      }
    );

  }
);
// =============================
// UPDATE PROFILE
// =============================
router.put(
  "/profile/:id",
  (req, res) => {

    const {
      name,
      phone,
    } = req.body;

    db.query(
      `
      UPDATE users
      SET
        name = ?,
        phone = ?
      WHERE id = ?
      `,
      [
        name,
        phone,
        req.params.id,
      ],
      (err) => {

        if (err) {

          return res.status(500).json({
            message:
              "Cập nhật thất bại",
          });

        }

        res.json({
          message:
            "Cập nhật thành công",
        });

      }
    );

  }
);
// =============================
// FORGOT PASSWORD
// =============================

router.post(
  "/forgot-password",
  (req, res) => {

    const { email } = req.body;

    if (!email) {

      return res.status(400).json({

        success: false,

        message: "Vui lòng nhập email."

      });

    }

    db.query(

      `
      SELECT id
      FROM users
      WHERE email = ?
      `,

      [email],

      async (err, rows) => {

        if (err) {

          console.log(err);

          return res.status(500).json({

            success: false,

            message: "Server error"

          });

        }

        if (!rows.length) {

          return res.status(404).json({

            success: false,

            message: "Email không tồn tại."

          });

        }

        const otp = Math.floor(

          100000 +

          Math.random() * 900000

        ).toString();

        const expiredAt =

          new Date(

            Date.now() +

            5 * 60 * 1000

          );

        db.query(

          `
          UPDATE users
          SET
            reset_otp = ?,
            otp_expired_at = ?
          WHERE email = ?
          `,

          [

            otp,

            expiredAt,

            email

          ],

          async (updateErr) => {

            if (updateErr) {

              console.log(updateErr);

              return res.status(500).json({

                success: false,

                message: "Không thể tạo OTP."

              });

            }

            try {

              await sendOTP(

                email,

                otp

              );

              return res.json({

                success: true,

                message:

                  "OTP đã được gửi tới email."

              });

            }

            catch (mailErr) {

              console.log(mailErr);

              return res.status(500).json({

                success: false,

                message:

                  "Không gửi được email."

              });

            }

          }

        );

      }

    );

  }

);

// =============================
// VERIFY OTP
// =============================

router.post(
  "/verify-otp",
  (req, res) => {

    const {

      email,

      otp,

    } = req.body;

    db.query(

      `
      SELECT
        reset_otp,
        otp_expired_at
      FROM users
      WHERE email = ?
      `,

      [email],

      (err, rows) => {

        if (err) {

          console.log(err);

          return res.status(500).json({

            success: false,

            message: "Server error",

          });

        }

        if (!rows.length) {

          return res.status(404).json({

            success: false,

            message: "Email không tồn tại.",

          });

        }

        const user =
          rows[0];

        if (

          !user.reset_otp

        ) {

          return res.status(400).json({

            success: false,

            message:
              "Bạn chưa yêu cầu OTP.",

          });

        }

        if (

          user.reset_otp !== otp

        ) {

          return res.status(400).json({

            success: false,

            message:
              "OTP không chính xác.",

          });

        }

        if (

          new Date() >

          new Date(
            user.otp_expired_at
          )

        ) {

          return res.status(400).json({

            success: false,

            message:
              "OTP đã hết hạn.",

          });

        }

        return res.json({

          success: true,

          message:
            "OTP hợp lệ.",

        });

      }

    );

  }

);

// =============================
// RESET PASSWORD
// =============================

router.post(
  "/reset-password",
  (req, res) => {

    const {

      email,

      otp,

      newPassword,

    } = req.body;

    if (

      !email ||

      !otp ||

      !newPassword

    ) {

      return res.status(400).json({

        success: false,

        message:
          "Thiếu dữ liệu."

      });

    }

    db.query(

      `
      SELECT
        reset_otp,
        otp_expired_at
      FROM users
      WHERE email = ?
      `,

      [email],

      (err, rows) => {

        if (err) {

          console.log(err);

          return res.status(500).json({

            success:false,

            message:"Server error"

          });

        }

        if (!rows.length) {

          return res.status(404).json({

            success:false,

            message:"Email không tồn tại."

          });

        }

        const user =
          rows[0];

        if (

          user.reset_otp !== otp

        ) {

          return res.status(400).json({

            success:false,

            message:"OTP không đúng."

          });

        }

        if (

          new Date() >

          new Date(
            user.otp_expired_at
          )

        ) {

          return res.status(400).json({

            success:false,

            message:"OTP đã hết hạn."

          });

        }

        db.query(

          `
          UPDATE users
          SET

            password = ?,

            reset_otp = NULL,

            otp_expired_at = NULL

          WHERE email = ?
          `,

          [

            newPassword,

            email

          ],

          (updateErr) => {

            if (updateErr) {

              console.log(updateErr);

              return res.status(500).json({

                success:false,

                message:
                  "Không thể cập nhật mật khẩu."

              });

            }

            return res.json({

              success:true,

              message:
                "Đổi mật khẩu thành công."

            });

          }

        );

      }

    );

  }

);
module.exports = router;