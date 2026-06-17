const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/holds/bulk
router.post("/bulk", (req, res) => {

  const {
    user_id,
    event_id,
    showtime_id,
    zone_id,
    seat_ids,
  } = req.body;

  if (
    !user_id ||
    !event_id ||
    !showtime_id ||
    !zone_id ||
    !seat_ids ||
    !seat_ids.length
  ) {
    return res.status(400).json({
      message: "Thiếu dữ liệu",
    });
  }

  const placeholders =
    seat_ids.map(() => "?").join(",");

  const checkSql = `
    SELECT seat_id
    FROM ticket_holds
    WHERE showtime_id = ?
      AND seat_id IN (${placeholders})
      AND status = 'ACTIVE'
      AND expires_at > NOW()
  `;

  db.query(
    checkSql,
    [showtime_id, ...seat_ids],
    (err, rows) => {

      if (err) {
        console.log(err);
        return res.status(500).json({
          message: "Server error",
        });
      }

      if (rows.length > 0) {

        return res.status(409).json({
          message:
            "Một hoặc nhiều ghế đang được thanh toán",
        });

      }

      const values = seat_ids.map(
        (seatId) => [
          user_id,
          event_id,
          showtime_id,
          zone_id,
          seatId,
        ]
      );

      const insertSql = `
        INSERT INTO ticket_holds
        (
          user_id,
          event_id,
          showtime_id,
          zone_id,
          seat_id,
          expires_at,
          status
        )
        VALUES ?
      `;

      const insertValues = values.map(
        (v) => [
          v[0],
          v[1],
          v[2],
          v[3],
          v[4],
          new Date(
            Date.now() +
              15 * 60 * 1000
          ),
          "ACTIVE",
        ]
      );

      db.query(
        insertSql,
        [insertValues],
        (insertErr) => {

          if (insertErr) {
            console.log(insertErr);

            return res.status(500).json({
              message: "Server error",
            });
          }

          return res.json({
            message:
              "Giữ ghế thành công",
          });

        }
      );

    }
  );

});

module.exports = router;