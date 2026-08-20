const express = require("express");
const router = express.Router();
const db = require("../db");

// 1. Lấy tổng quan doanh thu theo Ban tổ chức (Organizer)
router.get("/organizer/:organizerId", (req, res) => {
  const organizerId = req.params.organizerId;

  const sql = `
    SELECT 
      e.id,
      e.title,

      -- Đếm số vé đã bán ra của sự kiện
      (
        SELECT COUNT(*) 
        FROM tickets t
        WHERE t.event_id = e.id
      ) AS sold_tickets,

      -- Đếm số vé đã check-in (dùng)
      (
        SELECT COUNT(*) 
        FROM tickets t
        WHERE t.event_id = e.id 
          AND t.status = 'USED'
      ) AS checked_in,

      -- Lấy tổng số tiền THỰC TẾ đã thanh toán từ bảng payments (Đã trừ bớt Voucher / Mã giảm giá)
      (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE o.event_id = e.id 
          AND p.status = 'SUCCESS'
      ) AS revenue

    FROM events e
    WHERE e.organizer_id = ?
    ORDER BY revenue DESC
  `;

  db.query(sql, [organizerId], (err, rows) => {
    if (err) {
      console.log("Lỗi tính doanh thu:", err);
      return res.status(500).json({
        message: "Server error",
      });
    }

    res.json(rows);
  });
});

// 2. Lấy chi tiết các đơn hàng thanh toán THÀNH CÔNG của 1 sự kiện
router.get("/event/:eventId/orders", (req, res) => {
  const { eventId } = req.params;

  const sql = `
    SELECT 
      o.id AS order_id,
      o.created_at,
      u.name AS user_name,
      u.email AS user_email,
      (
        SELECT COUNT(*) 
        FROM tickets t 
        WHERE t.order_id = o.id
      ) AS ticket_quantity,
      o.total_price AS original_price,
      p.amount AS final_amount,
      p.payment_method
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN payments p ON o.id = p.order_id
    WHERE o.event_id = ? 
      AND p.status = 'SUCCESS'
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [eventId], (err, rows) => {
    if (err) {
      console.error("Lỗi lấy danh sách đơn hàng:", err);
      return res.status(500).json({ message: "Server error", error: err.message });
    }
    res.json(rows);
  });
});
module.exports = router;