const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/holds/bulk
router.post("/bulk", (req, res) => {
  console.log("========== HOLD REQUEST ==========");
console.log(JSON.stringify(req.body, null, 2));


  db.query(`
    DELETE
FROM ticket_holds
WHERE expires_at <= NOW()
  `);

const {
user_id,
event_id,
showtime_id,
seats,
} = req.body;

console.log("[HOLD] USER:", user_id);
console.log("[HOLD] EVENT:", event_id);
console.log("[HOLD] SHOWTIME:", showtime_id);
console.log("[HOLD] SEATS:", seats);

if (
  !user_id ||
  !event_id ||
  !showtime_id ||
  !seats ||
  !seats.length
) {
return res.status(400).json({
message: "Thiếu dữ liệu",
});
}

const seat_ids =
  seats.map(
    (seat) => seat.id
  );

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

  console.log("[HOLD] CHECK RESULT");
console.log("ERROR:", err);
console.log("ROWS:", rows);


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

  const values = seats.map(
  (seat) => [
    user_id,
    event_id,
    showtime_id,
    seat.zone_id,
    seat.id,
  ]
);
  const insertSql = `  INSERT INTO ticket_holds
  (
    user_id,
    event_id,
    showtime_id,
    zone_id,
    seat_id,
    expires_at,
    status
  )
  VALUES ?`;

const expiresAt = new Date(
Date.now() + 5 * 30 * 1000
);

console.log("SERVER NOW:", new Date());
console.log(
"SERVER NOW ISO:",
new Date().toISOString()
);

console.log("EXPIRES:", expiresAt);
console.log(
"EXPIRES ISO:",
expiresAt.toISOString()
);

console.log(
"EXPIRES VN:",
expiresAt.toLocaleString(
"vi-VN",
{
timeZone:
"Asia/Ho_Chi_Minh",
}
)
);

const expiresAtString =
expiresAt
  .toISOString()
  .slice(0, 19)
  .replace("T", " ");

const insertValues = values.map(
(v) => [
v[0],
v[1],
v[2],
v[3],
v[4],
expiresAtString,
"ACTIVE",
]
);

console.log(
"========== INSERT HOLD =========="
);

console.log("[HOLD] INSERT VALUES");
console.log(JSON.stringify(insertValues, null, 2));
db.query(
insertSql,
[insertValues],
(insertErr, result) => {

if (insertErr) {

console.error("========== HOLD INSERT ERROR ==========");
console.error(insertErr);

if (insertErr.sqlMessage)
  console.error(insertErr.sqlMessage);

if (insertErr.sql)
  console.error(insertErr.sql);

  return res.status(500).json({
    message: "Server error",
  });

}

console.log("========== HOLD INSERT SUCCESS ==========");
console.log(result);

return res.json({
  message:
    "Giữ ghế thành công",
  expires_at:
    expiresAt.toISOString(),
});

}
);


}

);

});

// DELETE /api/holds/release
router.delete(
  "/release",
  (req, res) => {

    const {
      user_id,
      showtime_id,
      seat_ids,
    } = req.body;

    if (
      !user_id ||
      !showtime_id ||
      !seat_ids?.length
    ) {

      return res
        .status(400)
        .json({
          message:
            "Thiếu dữ liệu",
        });

    }

    console.log(
      "========== RELEASE HOLD =========="
    );

    console.log(
      "USER:",
      user_id
    );

    console.log(
      "SHOWTIME:",
      showtime_id
    );

    console.log(
      "SEATS:",
      seat_ids
    );

    const placeholders =
      seat_ids
        .map(() => "?")
        .join(",");

    const sql = `
      DELETE
      FROM ticket_holds
      WHERE user_id = ?
      AND showtime_id = ?
      AND seat_id IN (${placeholders})
      AND status = 'ACTIVE'
    `;

    db.query(
      sql,
      [
        user_id,
        showtime_id,
        ...seat_ids,
      ],
      (err, result) => {

        if (err) {

          console.log(
            "RELEASE ERROR:",
            err
          );

          return res
            .status(500)
            .json({
              message:
                "Server error",
            });

        }

        console.log(
          "RELEASE SUCCESS:"
        );

        console.log(
          "AFFECTED ROWS:",
          result.affectedRows
        );

        return res.json({
          success: true,
          affectedRows:
            result.affectedRows,
        });

      }
    );

  }
);


module.exports = router;
