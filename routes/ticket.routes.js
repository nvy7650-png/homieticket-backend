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
      COALESCE(COUNT(tickets.id), 0) AS total_tickets,
      COALESCE(SUM(
        CASE WHEN tickets.status IN ('VALID','USED') THEN 1 ELSE 0 END
      ), 0) AS sold_tickets
    FROM events
    LEFT JOIN tickets
      ON tickets.event_id = events.id
    WHERE events.organizer_id = ?
    GROUP BY events.id, events.title, events.status
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
