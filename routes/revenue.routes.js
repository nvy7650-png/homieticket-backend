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

    (
        SELECT COUNT(*)
        FROM tickets t
        WHERE t.event_id = e.id
    ) AS sold_tickets,

    (
        SELECT COUNT(*)
        FROM tickets t
        WHERE t.event_id = e.id
        AND t.status = 'USED'
    ) AS checked_in,

    (
        SELECT COALESCE(SUM(o.total_price),0)
        FROM orders o
        WHERE o.event_id = e.id
        AND o.status = 'PAID'
    ) AS revenue

FROM events e

WHERE e.organizer_id = ?

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