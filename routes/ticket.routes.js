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

  e.id AS event_id,
  e.title AS event_title,
  e.location,
  e.image_url,

  st.start_time,

  t.issued_at

    FROM tickets t

    LEFT JOIN events e
      ON e.id = t.event_id

    LEFT JOIN seats s
      ON s.id = t.seat_id

    LEFT JOIN zones z
      ON z.id = t.zone_id
    LEFT JOIN showtimes st
  ON st.id = t.showtime_id

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

// GET /api/tickets/:id
router.get("/:id", (req, res) => {

  const ticketId = req.params.id;

  const sql = `
    SELECT
      t.*,
      e.title AS event_title,
    FROM tickets t
    LEFT JOIN events e
      ON e.id = t.event_id
    LEFT JOIN seats s
      ON s.id = t.seat_id
    LEFT JOIN zones z
      ON z.id = t.zone_id
      LEFT JOIN showtimes st
  ON st.id = t.showtime_id
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
  "/my-tickets/:userId",
  (req, res) => {

    const sql = `
      SELECT

        t.id,
        t.ticket_code,
        t.status,

        e.id AS event_id,
        e.title AS event_title,
        e.image_url,


        st.start_time

      FROM tickets t

      LEFT JOIN events e
      ON t.event_id = e.id

      LEFT JOIN seats s
      ON t.seat_id = s.id

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


module.exports = router;