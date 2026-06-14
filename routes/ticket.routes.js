const express = require("express");
const router = express.Router();
const db = require("../db");

// ============================
// GET organizer's events with ticket stats
// ============================
router.get("/organizer/:organizerId", (req, res) => {
  const organizerId = req.params.organizerId;

  const sql = `
    SELECT
      events.id AS event_id,
      events.title,
      events.status,
      COALESCE(
        CASE WHEN events.seat_mode = 'MANUAL' THEN (
          SELECT COUNT(s.id)
          FROM zones z
          JOIN seats s ON s.zone_id = z.id
          WHERE z.event_id = events.id
        ) ELSE (
          SELECT COALESCE(SUM(z.capacity), 0) FROM zones z WHERE z.event_id = events.id
        ) END
      , 0) AS total_tickets,
      COALESCE(
        CASE WHEN events.seat_mode = 'MANUAL' THEN (
          SELECT COUNT(s2.id)
          FROM zones z2
          JOIN seats s2 ON s2.zone_id = z2.id
          WHERE z2.event_id = events.id AND s2.status = 'SOLD'
        ) ELSE (
          SELECT COALESCE(SUM(CASE WHEN tk2.status IN ('VALID','USED') THEN 1 ELSE 0 END), 0)
          FROM tickets tk2 WHERE tk2.event_id = events.id
        ) END
      , 0) AS sold_tickets
    FROM events
    WHERE events.organizer_id = ?
    ORDER BY events.id DESC
  `;

  db.query(sql, [organizerId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    res.json(results);
  });
});


// ============================
// GET tickets for a specific event
// ============================
router.get("/event/:eventId", (req, res) => {
  const eventId = req.params.eventId;

  const sql = `
    SELECT
      t.id,
      t.ticket_code,
      t.status,
      u.name AS user_name,
      z.name AS zone_name,
      s.seat_code
    FROM tickets t
    LEFT JOIN users u
      ON t.user_id = u.id
    LEFT JOIN zones z
      ON t.zone_id = z.id
    LEFT JOIN seats s
      ON t.seat_id = s.id
    WHERE t.event_id = ?
    ORDER BY t.id DESC
  `;

  db.query(sql, [eventId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    res.json(results);
  });
});

module.exports = router;
