const express = require("express");
const router = express.Router();
const db = require("../db");

// ============================
// 1. Thống kê tổng quan cho Admin Dashboard
// ============================
router.get("/stats", (req, res) => {
  const usersSql = "SELECT COUNT(*) AS total FROM users";
  const eventsSql = "SELECT COUNT(*) AS total FROM events";
  const ordersSql = "SELECT COUNT(*) AS total FROM orders";
  const revenueSql = `
    SELECT IFNULL(SUM(amount), 0) AS total 
    FROM payments 
    WHERE status = 'SUCCESS'
  `;

  db.query(usersSql, (err1, usersResult) => {
    if (err1) return res.status(500).json({ message: "Lỗi câu lệnh users", error: err1 });

    db.query(eventsSql, (err2, eventsResult) => {
      if (err2) return res.status(500).json({ message: "Lỗi câu lệnh events", error: err2 });

      db.query(ordersSql, (err3, ordersResult) => {
        if (err3) return res.status(500).json({ message: "Lỗi câu lệnh orders", error: err3 });

        db.query(revenueSql, (err4, revenueResult) => {
          if (err4) return res.status(500).json({ message: "Lỗi câu lệnh revenue", error: err4 });

          res.json({
            totalUsers: usersResult[0].total,
            totalEvents: eventsResult[0].total,
            totalOrders: ordersResult[0].total,
            revenue: revenueResult[0].total,
          });
        });
      });
    });
  });
});

// ============================
// 2. Lấy danh sách tất cả người dùng
// ============================
router.get("/users", (req, res) => {
  const sql = `
    SELECT id, name, email, role, status, created_at
    FROM users
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("GET USERS ERROR:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    res.json(rows);
  });
});

// ============================
// 3. Lấy danh sách tất cả đơn hàng
// ============================
router.get("/orders", (req, res) => {
  const sql = `
    SELECT 
      o.id, o.total_price, o.status, o.created_at,
      e.id AS event_id, e.title AS event_title
    FROM orders o
    LEFT JOIN events e ON o.event_id = e.id
    ORDER BY o.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("GET ORDERS ERROR:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    res.json(rows);
  });
});

// ============================
// 4. Lấy danh sách Doanh thu
// ============================
router.get("/revenue", (req, res) => {
  const sql = `
    SELECT 
      p.id, p.order_id, p.payment_method, p.amount, p.status, p.paid_at,
      e.id AS event_id, e.title AS event_title,
      u.id AS organizer_id, u.name AS organizer_name, u.email AS organizer_email
    FROM payments p
    LEFT JOIN orders o ON p.order_id = o.id
    LEFT JOIN events e ON o.event_id = e.id
    LEFT JOIN users u ON e.organizer_id = u.id
    WHERE p.status = 'SUCCESS'
    ORDER BY p.paid_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("GET REVENUE ERROR:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    res.json(rows);
  });
});

// ============================
// 5. Lấy thông tin chi tiết 1 user theo ID
// ============================
router.get("/users/:id", (req, res) => {
  const sql = `
    SELECT id, name, email, phone, role, status, created_at
    FROM users
    WHERE id = ?
  `;

  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error("GET USER BY ID ERROR:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    res.json(results[0]);
  });
});

// ============================
// 6. Khóa tài khoản người dùng
// ============================
router.put("/users/:id/block", (req, res) => {
  const sql = `
    UPDATE users
    SET status = 'BLOCKED'
    WHERE id = ?
  `;

  db.query(sql, [req.params.id], (err) => {
    if (err) {
      console.error("BLOCK USER ERROR:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    res.json({ success: true, message: "Đã khóa tài khoản thành công" });
  });
});

// ============================
// 7. Mở khóa tài khoản người dùng
// ============================
router.put("/users/:id/unblock", (req, res) => {
  const sql = `
    UPDATE users
    SET status = 'ACTIVE'
    WHERE id = ?
  `;

  db.query(sql, [req.params.id], (err) => {
    if (err) {
      console.error("UNBLOCK USER ERROR:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    res.json({ success: true, message: "Đã mở khóa tài khoản thành công" });
  });
});

module.exports = router;