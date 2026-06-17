const express = require("express");
const router = express.Router();
const db = require("../db");

// GET /api/tickets/my/:userId
router.get("/my/:userId", (req, res) => {

  const userId = req.params.userId;

  const sql = `
    SELECT
      t.id,
      t.ticket_code,
      t.qr_code,
      t.status,

      e.title AS event_title,

      s.seat_code,

      z.name AS zone_name,

      t.issued_at

    FROM tickets t

    LEFT JOIN events e
      ON e.id = t.event_id

    LEFT JOIN seats s
      ON s.id = t.seat_id

    LEFT JOIN zones z
      ON z.id = t.zone_id

    WHERE t.user_id = ?

    ORDER BY t.issued_at DESC
  `;

  db.query(
    sql,
    [userId],
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

module.exports = router;