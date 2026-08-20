const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/holds/bulk
router.post("/bulk", async (req, res) => {
  console.log("========== HOLD REQUEST ==========");
  console.log(JSON.stringify(req.body, null, 2));

  const { user_id, event_id, showtime_id, seats } = req.body;

  console.log("[HOLD] USER:", user_id);
  console.log("[HOLD] EVENT:", event_id);
  console.log("[HOLD] SHOWTIME:", showtime_id);
  console.log("[HOLD] SEATS:", seats);

  if (!user_id || !event_id || !showtime_id || !seats || !seats.length) {
    return res.status(400).json({
      message: "Thiếu dữ liệu",
    });
  }

  const seat_ids = seats.map((seat) => seat.id);
  const placeholders = seat_ids.map(() => "?").join(",");

  try {
    // 1. Dọn dẹp các giữ ghế đã hết hạn TRƯỚC KHI kiểm tra (sử dụng Promise / async-await)
    await new Promise((resolve, reject) => {
      db.query(
        `DELETE FROM ticket_holds WHERE expires_at <= NOW()`,
        (err, res) => (err ? reject(err) : resolve(res))
      );
    });

    // 2. Kiểm tra xem có ghế nào đang bị hold hợp lệ không
    const checkSql = `
      SELECT seat_id
      FROM ticket_holds
      WHERE showtime_id = ?
        AND seat_id IN (${placeholders})
        AND status = 'ACTIVE'
        AND expires_at > NOW()
    `;

    const rows = await new Promise((resolve, reject) => {
      db.query(checkSql, [showtime_id, ...seat_ids], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    console.log("[HOLD] CHECK RESULT ROWS:", rows);

    if (rows.length > 0) {
      return res.status(409).json({
        message: "Một hoặc nhiều ghế đang được thanh toán",
        seats: rows.map((row) => row.seat_id),
      });
    }

    // 3. Chuẩn bị Insert: Dùng hàm `DATE_ADD(NOW(), INTERVAL 150 SECOND)` của MySQL 
    //    để trực tiếp tính giờ ở Database, TRÁNH LỖI MÚI GIỜ JavaScript ISO String!
    const insertValues = [];
    const valuePlaceholders = seats
      .map((seat) => {
        insertValues.push(
          user_id,
          event_id,
          showtime_id,
          seat.zone_id,
          seat.id,
          "ACTIVE"
        );
        return "(?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 150 SECOND), ?)";
      })
      .join(", ");

    const insertSql = `
      INSERT INTO ticket_holds (
        user_id,
        event_id,
        showtime_id,
        zone_id,
        seat_id,
        expires_at,
        status
      )
      VALUES ${valuePlaceholders}
    `;

    console.log("========== INSERT HOLD ==========");
    
    const result = await new Promise((resolve, reject) => {
      db.query(insertSql, insertValues, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    console.log("========== HOLD INSERT SUCCESS ==========");
    console.log(result);

    // Tính toán thời gian phản hồi client (150 giây = 2.5 phút)
    const expiresAt = new Date(Date.now() + 150 * 1000);

    return res.json({
      message: "Giữ ghế thành công",
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("========== HOLD ERROR ==========");
    console.error(err);

    // Xử lý trường hợp 2 người cùng bấm chọn ghế 1 lúc (Duplicate Key)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Một hoặc nhiều ghế vừa bị người khác nhanh tay giữ trước!",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// DELETE /api/holds/release
router.delete("/release", (req, res) => {
  const { user_id, showtime_id, seat_ids } = req.body;

  if (!user_id || !showtime_id || !seat_ids?.length) {
    return res.status(400).json({
      message: "Thiếu dữ liệu",
    });
  }

  console.log("========== RELEASE HOLD ==========");
  console.log("USER:", user_id);
  console.log("SHOWTIME:", showtime_id);
  console.log("SEATS:", seat_ids);

  const placeholders = seat_ids.map(() => "?").join(",");

  const sql = `
    DELETE FROM ticket_holds
    WHERE user_id = ?
      AND showtime_id = ?
      AND seat_id IN (${placeholders})
      AND status = 'ACTIVE'
  `;

  db.query(sql, [user_id, showtime_id, ...seat_ids], (err, result) => {
    if (err) {
      console.log("RELEASE ERROR:", err);
      return res.status(500).json({
        message: "Server error",
      });
    }

    console.log("RELEASE SUCCESS:");
    console.log("AFFECTED ROWS:", result.affectedRows);

    return res.json({
      success: true,
      affectedRows: result.affectedRows,
    });
  });
});

module.exports = router;