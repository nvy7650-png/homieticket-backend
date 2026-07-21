const express = require("express");

const router = express.Router();

const db = require("../db");

// ============================
// ADMIN STATS
// ============================

router.get("/stats", (req, res) => {

  // USERS
  const usersSql =
    "SELECT COUNT(*) AS total FROM users";

  // EVENTS
  const eventsSql =
    "SELECT COUNT(*) AS total FROM events";

  // ORDERS
  const ordersSql =
    "SELECT COUNT(*) AS total FROM orders";

  // REVENUE
  const revenueSql = `
    SELECT
      IFNULL(SUM(amount), 0) AS total
    FROM payments
    WHERE status = 'SUCCESS'
  `;

  db.query(usersSql, (err1, usersResult) => {

    if (err1) {

      return res
        .status(500)
        .json(err1);

    }

    db.query(eventsSql, (err2, eventsResult) => {

      if (err2) {

        return res
          .status(500)
          .json(err2);

      }

      db.query(ordersSql, (err3, ordersResult) => {

        if (err3) {

          return res
            .status(500)
            .json(err3);

        }

        db.query(revenueSql, (err4, revenueResult) => {

          if (err4) {

            return res
              .status(500)
              .json(err4);

          }

          res.json({

            totalUsers:
              usersResult[0].total,

            totalEvents:
              eventsResult[0].total,

            totalOrders:
              ordersResult[0].total,

            revenue:
              revenueResult[0].total,

          });

        });

      });

    });

  });

});

// GET ALL USERS
router.get("/users", (req, res) => {

  const sql = `
    SELECT
      id,
      name,
      email,
      role,
      status,
      created_at
    FROM users
    ORDER BY created_at DESC
  `;

  db.query(
    sql,
    (err, rows) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Lỗi server",
        });

      }

      res.json(rows);

    }
  );

});

// BLOCK USER
router.put("/users/:id/block", (req, res) => {

  const sql = `
    UPDATE users
    SET status = 'BLOCKED'
    WHERE id = ?
  `;

  db.query(
    sql,
    [req.params.id],
    (err) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Lỗi server",
        });

      }

      res.json({
        success: true,
      });

    }
  );

});

// UNBLOCK USER
router.put("/users/:id/unblock", (req, res) => {

  const sql = `
    UPDATE users
    SET status = 'ACTIVE'
    WHERE id = ?
  `;

  db.query(
    sql,
    [req.params.id],
    (err) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Lỗi server",
        });

      }

      res.json({
        success: true,
      });

    }
  );

});
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

// =============================
// GET ALL ORDERS
// =============================
router.get("/orders", (req, res) => {

  const sql = `
    SELECT
      o.id,
      o.total_price,
      o.status,
      o.created_at,

      e.id AS event_id,
      e.title AS event_title

    FROM orders o

    LEFT JOIN events e
      ON o.event_id = e.id

    ORDER BY o.created_at DESC
  `;

  db.query(sql, (err, rows) => {

    if (err) {

      console.log(err);

      return res.status(500).json({
        message: "Lỗi server",
      });

    }

    res.json(rows);

  });

});
module.exports = router;