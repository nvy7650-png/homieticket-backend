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
(
  SELECT COUNT(ss.id)
  FROM zones z
  JOIN seats s
    ON s.zone_id = z.id
  JOIN showtime_seats ss
    ON ss.seat_id = s.id
  WHERE z.event_id = events.id
)
, 0) AS total_tickets,
      COALESCE(
(
  SELECT COUNT(*)
  FROM tickets tk2
  WHERE tk2.event_id = events.id
    AND tk2.status IN ('VALID','USED')
)
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
