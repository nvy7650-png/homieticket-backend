const express = require("express");
const router = express.Router();
const db = require("../db");

router.get(
  "/my-tickets/:userId",
  (req, res) => {

    const sql = `
     SELECT
  t.id,
  t.ticket_code,
  t.status,
  t.standing_number,

  e.id AS event_id,
  e.title AS event_title,
  e.location,

  s.seat_code,
  z.name AS zone_name,

  st.start_time

FROM tickets t

LEFT JOIN events e
ON t.event_id = e.id

LEFT JOIN seats s
ON t.seat_id = s.id

LEFT JOIN zones z
ON t.zone_id = z.id

LEFT JOIN showtimes st
ON t.showtime_id = st.id

WHERE t.user_id = ?

ORDER BY t.id DESC
    `;

    db.query(
      sql,
      [req.params.userId],
      (err, result) => {

        if (err) {

          return res.status(500).json({
            message: "Server error",
          });

        }

        res.json(result);

      }
    );

  }
);

// GET /api/tickets/:id
router.get("/:id", (req, res) => {

  const ticketId = req.params.id;

  const sql = `
   SELECT
  t.*,
  e.title AS event_title

FROM tickets t

LEFT JOIN events e
ON e.id = t.event_id

WHERE t.id = ?
  `;

  db.query(
    sql,
    [ticketId],
    (err, rows) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          message: "Lỗi server",
        });
      }

      if (!rows.length) {

        return res.status(404).json({
          message: "Không tìm thấy vé",
        });

      }

      res.json(rows[0]);

    }
  );

});

// POST /api/tickets/checkin
router.post("/checkin", (req, res) => {

  const { ticket_code } = req.body;

  if (!ticket_code) {

    return res.status(400).json({
      success: false,
      message: "Thiếu ticket code",
    });

  }

  const findSql = `
    SELECT
      t.*,
      e.title AS event_title,
      s.seat_code
    FROM tickets t

    LEFT JOIN events e
      ON e.id = t.event_id

    LEFT JOIN seats s
      ON s.id = t.seat_id

    WHERE t.ticket_code = ?
  `;

  db.query(
    findSql,
    [ticket_code],
    (err, rows) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          success: false,
          message: "Lỗi server",
        });

      }

      if (!rows.length) {

        return res.status(404).json({
          success: false,
          message: "Vé không hợp lệ",
        });

      }

      const ticket = rows[0];

      if (ticket.status === "USED") {

        return res.json({
          success: false,
          message: "Vé đã được sử dụng",
          ticket,
        });

      }

      const updateSql = `
        UPDATE tickets
        SET status = 'USED'
        WHERE id = ?
      `;

      db.query(
        updateSql,
        [ticket.id],
        (updateErr) => {

          if (updateErr) {

            console.log(updateErr);

            return res.status(500).json({
              success: false,
              message: "Lỗi server",
            });

          }

          return res.json({
            success: true,
            message: "Check-in thành công",
            ticket,
          });

        }
      );

    }
  );

});
router.get(
  "/organizer/:organizerId",
  (req, res) => {

    const organizerId =
      req.params.organizerId;

    const sql = `
      SELECT
        e.id AS event_id,
        e.title,
        e.status,

        COUNT(t.id) AS sold_tickets,

        (
          SELECT COUNT(*)
          FROM seats s
          INNER JOIN zones z
          ON s.zone_id = z.id
          WHERE z.event_id = e.id
        ) AS total_tickets,

        (
          SELECT COUNT(*)
          FROM tickets tk
          WHERE tk.event_id = e.id
          AND tk.status = 'USED'
        ) AS checked_in

      FROM events e

      LEFT JOIN tickets t
      ON t.event_id = e.id

      WHERE e.organizer_id = ?

      GROUP BY e.id

      ORDER BY e.id DESC
    `;

    db.query(
      sql,
      [organizerId],
      (err, rows) => {

        if (err) {

          console.log(err);

          return res.status(500).json({
            message: "Server error",
          });

        }

        res.json(rows);

      }
    );

  }
);
router.get(
  "/event/:eventId",
  (req, res) => {

    const eventId =
      req.params.eventId;

    const sql = `
      SELECT
        t.id,
        t.ticket_code,
        t.status,

        z.name AS zone_name,

        s.seat_code,

        st.start_time,

        u.name AS user_name,
        u.email

      FROM tickets t

      LEFT JOIN users u
      ON u.id = t.user_id

      LEFT JOIN zones z
      ON z.id = t.zone_id

      LEFT JOIN seats s
      ON s.id = t.seat_id

      LEFT JOIN showtimes st
      ON st.id = t.showtime_id

      WHERE t.event_id = ?

      ORDER BY t.id DESC
    `;

    db.query(
      sql,
      [eventId],
      (err, rows) => {

        if (err) {

          console.log(err);

          return res.status(500).json({
            message: "Server error",
          });

        }

        res.json(rows);

      }
    );

  }
);

module.exports = router;