const express = require("express");
const router = express.Router();
const db = require("../db");

router.get(
  "/organizer/:organizerId",
  (req, res) => {

    const organizerId =
      req.params.organizerId;

    const sql = `
      SELECT
        e.id,
        e.title,

        COUNT(t.id) AS sold_tickets,

        SUM(z.price) AS revenue,

        (
          SELECT COUNT(*)
          FROM tickets tk
          WHERE tk.event_id = e.id
          AND tk.status = 'USED'
        ) AS checked_in

      FROM events e

      LEFT JOIN tickets t
      ON t.event_id = e.id

      LEFT JOIN zones z
      ON z.id = t.zone_id

      WHERE e.organizer_id = ?

      GROUP BY e.id

      ORDER BY revenue DESC
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

module.exports = router;