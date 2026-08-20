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

      -- 1. Tính TỔNG SỐ VÉ TỐI ĐA (Capacity) của sự kiện 
      -- (Tùy theo loại khu vực: STANDING lấy capacity, SEATED lấy rows * seats_per_row)
      (
        SELECT COALESCE(SUM(
          CASE 
            WHEN z.zone_type = 'STANDING' THEN z.capacity
            ELSE (z.rows * z.seats_per_row)
          END
        ), 0) * (SELECT COUNT(*) FROM showtimes st WHERE st.event_id = e.id)
        FROM zones z
        WHERE z.event_id = e.id
      ) AS total_tickets,

      -- 2. Đếm số vé ĐÃ BÁN RA (nối tickets -> order_items -> orders)
      (
        SELECT COUNT(t.id) 
        FROM tickets t
        JOIN order_items oi ON t.order_item_id = oi.id
        JOIN orders o ON oi.order_id = o.id
        JOIN payments p ON o.id = p.order_id
        WHERE o.event_id = e.id 
          AND p.status = 'SUCCESS'
      ) AS sold_tickets,

      -- 3. Đếm số vé ĐÃ CHECK-IN (status = 'USED')
      (
        SELECT COUNT(t.id) 
        FROM tickets t
        JOIN order_items oi ON t.order_item_id = oi.id
        JOIN orders o ON oi.order_id = o.id
        JOIN payments p ON o.id = p.order_id
        WHERE o.event_id = e.id 
          AND t.status = 'USED'
          AND p.status = 'SUCCESS'
      ) AS checked_in,

      -- 4. Tổng tiền THỰC TẾ thu được từ thanh toán thành công
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
        error: err.message
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
        SELECT COUNT(t.id) 
        FROM tickets t
        JOIN order_items oi ON t.order_item_id = oi.id
        WHERE oi.order_id = o.id
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