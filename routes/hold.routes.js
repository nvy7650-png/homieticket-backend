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
`;

db.query(
checkSql,
[showtime_id, ...seat_ids],
(err, rows) => {

  console.log("========== HOLD CHECK ==========");
  console.log("SHOWTIME:", showtime_id);
  console.log("SEAT_IDS:", seat_ids);
  console.log("FOUND_ROWS:", rows);

  if (err) {
    console.log("CHECK ERROR:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }

 if (rows.length > 0) {

  return res.status(409).json({
    message:
      "Một hoặc nhiều ghế đang được thanh toán",
    seats: rows.map(
      (row) => row.seat_id
    ),
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

  const expiresAt =
  new Date(
    Date.now() +
    (15 * 60 * 1000) +
    (7 * 60 * 60 * 1000)
  );

console.log(
  "NOW:",
  new Date()
);

console.log(
  "EXPIRES:",
  expiresAt
);

const insertValues = values.map(
  (v) => [
    v[0],
    v[1],
    v[2],
    v[3],
    v[4],
    expiresAt,
    "ACTIVE",
  ]
);

  console.log("========== INSERT HOLD ==========");
  console.log("INSERT VALUES:");
  console.log(insertValues);

  db.query(
    insertSql,
    [insertValues],
    (insertErr, result) => {

      if (insertErr) {

        console.log(
          "INSERT ERROR:",
          insertErr
        );

        return res.status(500).json({
          message: "Server error",
        });

      }

      console.log(
        "INSERT SUCCESS:"
      );

      console.log(result);

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
