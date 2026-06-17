const express = require("express");

const router = express.Router();

const db = require("../db");

const multer = require("multer");

const path = require("path");

const fs = require("fs");


// ============================
// CREATE UPLOADS FOLDER
// ============================

if (!fs.existsSync("uploads")) {

  fs.mkdirSync("uploads");

}


// ============================
// MULTER CONFIG
// ============================

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    cb(null, "uploads/");

  },

  filename: (req, file, cb) => {

    cb(

      null,

      Date.now() +
      path.extname(file.originalname)

    );

  },

});

const upload = multer({
  storage,
});


// ============================
// GET ALL APPROVED EVENTS
// HOMEPAGE
// ============================
router.get("/", (req, res) => {

  const sql = `
  SELECT
    e.*,
    c.name AS category_name,

    MIN(s.start_time) AS first_showtime,

    (
      SELECT MIN(z.price)
      FROM zones z
      WHERE z.event_id = e.id
    ) AS min_price

  FROM events e

  LEFT JOIN categories c
    ON e.category_id = c.id

  LEFT JOIN showtimes s
    ON s.event_id = e.id

  WHERE e.status = 'APPROVED'

  GROUP BY e.id

  ORDER BY e.created_at DESC
`;

  db.query(sql, (err, results) => {

    if (err) {
      console.log(err);
      return res.status(500).json({
        message: "Lỗi server",
      });
    }

    res.json(results);

  });

});

router.get('/:id', (req, res) => {

  const sql = `

    SELECT

      events.*,

      categories.name
      AS category_name

    FROM events

    LEFT JOIN categories

    ON events.category_id =
    categories.id

    WHERE events.id = ?

  `;

  db.query(

    sql,

    [req.params.id],

    (err, results) => {

      if (err) {

        console.log(err);

        return res
          .status(500)
          .json({
            message: "Lỗi server",
          });

      }

      if (
        results.length === 0
      ) {

        return res
          .status(404)
          .json({
            message:
              "Không tìm thấy sự kiện",
          });

      }

      const event = results[0];

      const showtimesSql = `
        SELECT *
        FROM showtimes
        WHERE event_id = ?
      `;

      db.query(showtimesSql, [req.params.id], (err2, showtimeResults) => {
        if (err2) {
          console.log(err2);
          return res.status(500).json({ message: "Lỗi server" });
        }

        const zonesSql = `
          SELECT
            id,
            name,
            price,
            capacity,
            zone_type,
            total_rows,
            seats_per_row,
            sale_start,
            sale_end
          FROM zones
          WHERE event_id = ?
          ORDER BY id
        `;

        db.query(zonesSql, [req.params.id], (err3, zoneResults) => {
          if (err3) {
            console.log(err3);
            return res.status(500).json({ message: "Lỗi server" });
          }

          res.json({
            event: event,
            showtimes: showtimeResults,
            zones: zoneResults,
          });

        });

      });

    }

  );

});

// ============================
// ORGANIZER EVENTS
// ============================

router.get(
  "/organizer/:id",
  (req, res) => {

    const organizerId =
      req.params.id;

    const sql = `

      SELECT

        events.*,

        categories.name
        AS category_name

      FROM events

      LEFT JOIN categories

      ON events.category_id =
      categories.id

      WHERE events.organizer_id = ?

      ORDER BY events.id DESC

    `;

    db.query(

      sql,

      [organizerId],

      (err, results) => {

        if (err) {

          console.log(err);

          return res
            .status(500)
            .json({
              message:
                "Lỗi server",
            });

        }

        res.json(results);

      }

    );

  }

);

// ============================
// ORGANIZER STATS
// ============================

router.get(
  "/organizer/:id/stats",
  (req, res) => {

    const organizerId =
      req.params.id;

    const sql = `

      SELECT
        COUNT(*) AS totalEvents

      FROM events

      WHERE organizer_id = ?

    `;

    db.query(

      sql,

      [organizerId],

      (err, results) => {

        if (err) {

          console.log(err);

          return res
            .status(500)
            .json({
              message: "Lỗi server",
            });

        }

        res.json({

          totalEvents:
            results[0]
              .totalEvents,

          totalTickets: 0,

          revenue: 0,

        });

      }

    );

  }

);


// ============================
// GET EVENT SEATS
// ============================

router.get("/:eventId/seats", (req, res) => {

  const sql = `

    SELECT

      seats.id
      AS seat_id,

      zones.id
      AS zone_id,

      zones.name
      AS zone_name,

      zones.price,

      seats.row_label,

      seats.seat_number,

      seats.seat_code,

      'AVAILABLE' AS status

    FROM events

    JOIN zones

    ON zones.event_id =
    events.id

    JOIN seats

    ON seats.zone_id =
    zones.id

    WHERE events.id = ?

    ORDER BY

      zone_id,

      seats.row_label,

      seats.seat_number

  `;

  db.query(

    sql,

    [req.params.eventId],

    (err, results) => {

      if (err) {

        console.log(err);

        return res
          .status(500)
          .json({
            message: "Lỗi server",
          });

      }

      res.json(results);

    }

  );

});


// ============================
// GET EVENT SEATMAP
// ============================

router.get("/:eventId/seatmap", (req, res) => {

  const eventId =
    req.params.eventId;

  const eventSql = `

    SELECT

      id,

      title,

      location,

      image_url

    FROM events

    WHERE id = ?

  `;

  db.query(

    eventSql,

    [eventId],

    (err, eventResults) => {

      if (err) {

        console.log(err);

        return res
          .status(500)
          .json({
            message: "Lỗi server",
          });

      }

      if (eventResults.length === 0) {

        return res
          .status(404)
          .json({
            message: "Không tìm thấy sự kiện",
          });

      }

      const zonesSql = `

        SELECT
  id,
  name,
  price,
  zone_type,
  capacity,
  total_rows,
  seats_per_row,
  sale_start,
  sale_end
FROM zones

        WHERE event_id = ?

        ORDER BY id

      `;

      db.query(

        zonesSql,

        [eventId],

        (err, zoneResults) => {

          if (err) {

            console.log(err);

            return res
              .status(500)
              .json({
                message: "Lỗi server",
              });

          }

          const seatsSql = `

            SELECT

              seats.*

            FROM seats

            JOIN zones

            ON seats.zone_id =
            zones.id

            WHERE zones.event_id = ?

            ORDER BY

              seats.zone_id,

              seats.row_label,

              seats.seat_number

          `;

          db.query(

            seatsSql,

            [eventId],

            (err, seatResults) => {

              if (err) {

                console.log(err);

                return res
                  .status(500)
                  .json({
                    message: "Lỗi server",
                  });

              }

              res.json({

                event:
                  eventResults[0],

                zones:
                  zoneResults,

                seats:
                  seatResults,

              });

            }

          );

        }

      );

    }

  );

});

router.get("/:id", (req, res) => {

  const sql = `

    SELECT

      events.*,

      categories.name
      AS category_name

    FROM events

    LEFT JOIN categories

    ON events.category_id =
    categories.id

    WHERE events.id = ?

  `;

  db.query(

    sql,

    [req.params.id],

    (err, results) => {

      if (err) {

        console.log(err);

        return res
          .status(500)
          .json({
            message: "Lỗi server",
          });

      }

      if (
        results.length === 0
      ) {

        return res
          .status(404)
          .json({
            message:
              "Không tìm thấy sự kiện",
          });

      }

      res.json(results[0]);

    }

  );

});


// ============================
// CREATE FULL EVENT
// STEP 3 FINAL
// ============================

function createShowtimeInventory(eventId, showtimeId) {
  const seatsSql = `
    SELECT
      s.id AS seat_id,
      s.zone_id
    FROM seats s
    JOIN zones z
      ON z.id = s.zone_id
    WHERE z.event_id = ?
  `;

  db.query(seatsSql, [eventId], (err, seats) => {
    if (err) {
      console.log(err);
      return;
    }

    seats.forEach((seat) => {
      db.query(
        `
        INSERT INTO showtime_seats
        (
          showtime_id,
          seat_id,
          zone_id,
          status
        )
        VALUES (?, ?, ?, 'AVAILABLE')
        `,
        [
          showtimeId,
          seat.seat_id,
          seat.zone_id
        ]
      );
    });

    const standingSql = `
      SELECT
        id,
        capacity
      FROM zones
      WHERE event_id = ?
        AND zone_type = 'STANDING'
    `;

    db.query(
      standingSql,
      [eventId],
      (err, zones) => {

        if (err) {
          console.log(err);
          return;
        }

        zones.forEach((zone) => {
          db.query(
            `
            INSERT INTO showtime_standing_inventory
            (
              showtime_id,
              zone_id,
              capacity,
              sold_count
            )
            VALUES (?, ?, ?, 0)
            `,
            [
              showtimeId,
              zone.id,
              zone.capacity
            ]
          );
        });

      }
    );
  });
}
function createSeatsForZone(
  zoneId,
  rows,
  seatsPerRow
) {

  return new Promise((resolve, reject) => {

    let total =
      rows * seatsPerRow;

    if (total === 0) {
      resolve();
      return;
    }

    let completed = 0;

    for (
      let rowIndex = 0;
      rowIndex < rows;
      rowIndex++
    ) {

      const rowLabel =
        String.fromCharCode(
          65 + rowIndex
        );

      for (
        let seatNumber = 1;
        seatNumber <= seatsPerRow;
        seatNumber++
      ) {

        db.query(

          `
          INSERT INTO seats
          (
            zone_id,
            row_label,
            seat_number,
            seat_code
          )
          VALUES (?, ?, ?, ?)
          `,

          [
            zoneId,
            rowLabel,
            seatNumber,
            `${rowLabel}${seatNumber}`
          ],

          (err) => {

            if (err) {
              reject(err);
              return;
            }

            completed++;

            if (
              completed === total
            ) {
              resolve();
            }

          }

        );

      }

    }

  });

}

router.post("/create-full",

  upload.single("image"),

  (req, res) => {

    try {

      const {

        organizer_id,

        category_id,

        title,

        description,

        location,

        seat_mode,

        showtimes,

        zones,

      } = req.body;

      // IMAGE
      if (!req.file) {

        return res
          .status(400)
          .json({
            message:
              "Banner sự kiện là bắt buộc",
          });

      }

      // IMAGE URL
      const image_url =
        `/uploads/${req.file.filename}`;

      // INSERT EVENT
      const eventSql = `

        INSERT INTO events

        (

          organizer_id,

          category_id,

          title,

          description,

          location,

          image_url,

          seat_mode,

          status

        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?)

      `;

      db.query(

        eventSql,

        [

          organizer_id,

          category_id || null,

          title,

          description || null,

          location,

          image_url,

          seat_mode,

          "PENDING",

        ],

        (err, eventResult) => {

          if (err) {

            console.log(err);

            return res
              .status(500)
              .json({
                message:
                  "Tạo event thất bại",
              });

          }

          const eventId =
            eventResult.insertId;

          const parsedZones = JSON.parse(zones || "[]");

          const formatMySQLDateTime = (value) => {
            if (!value) return null;

            return new Date(value)
              .toISOString()
              .slice(0, 19)
              .replace("T", " ");
          };

          // Always insert zones for both MANUAL and AUTO
          parsedZones.forEach((zone) => {

            const zoneType =
              seat_mode === "MANUAL"
                ? "SEATING"
                : (zone.zone_type || "SEATING");

            const capacity =
              zoneType === "STANDING"
                ? Number(zone.capacity || 0)
                : Number(zone.rows || 0) * Number(zone.seatsPerRow || 0);

            const zoneSql = `
              INSERT INTO zones
              (
                event_id,
                name,
                price,
                capacity,
                zone_type,
                total_rows,
                seats_per_row,
                sale_start,
                sale_end
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(zoneSql, [eventId, zone.name, zone.price, capacity, zoneType, Number(zone.rows || 0), Number(zone.seatsPerRow || 0), formatMySQLDateTime(zone.sale_start), formatMySQLDateTime(zone.sale_end)], (err, zoneResult) => {
              if (err) {
                console.log(err);
                return;
              }

              console.log("ZONE INSERT OK", zoneResult.insertId);

              const zoneId = zoneResult.insertId;

console.log(
  "SEAT MODE:",
  seat_mode
);

console.log(
  "ZONE TYPE:",
  zone.zone_type
);

if (zoneType === "SEATING") {

  console.log(
    "CALLING CREATE SEATS..."
  );

  createSeatsForZone(
    zoneId,
    Number(zone.rows || 0),
    Number(zone.seatsPerRow || 0)
  )
    .then(() => {
      console.log(
        `SEATS CREATED FOR ZONE ${zoneId}`
      );
    })
    .catch((err) => {
      console.log(
        "CREATE SEATS ERROR:",
        err
      );
    });

}
              

            });

          });

          // PARSE SHOWTIMES
          const parsedShowtimes =
            JSON.parse(showtimes);

          console.log("========== CREATE FULL ==========");
          console.log("TITLE:", title);
          console.log("SHOWTIMES:", parsedShowtimes);
          console.log("ZONES:", parsedZones);

          console.log("SHOWTIMES RECEIVED:");
          console.log(parsedShowtimes);

          // LOOP SHOWTIMES
          parsedShowtimes.forEach(
            (showtime) => {

              console.log("INSERT SHOWTIME:", showtime);

              const showtimeSql = `

                INSERT INTO showtimes

                (

                  event_id,

                  start_time,

                  end_time

                )

                VALUES (?, ?, ?)

              `;

              db.query(

                showtimeSql,

                [

                  eventId,


                  formatMySQLDateTime(showtime.start_time),

                  formatMySQLDateTime(showtime.end_time),

                ],

                (

                  err,

                  showtimeResult

                ) => {

                  if (err) {

                    console.log(err);

                    return;

                  }

                  console.log("SHOWTIME INSERT OK", showtimeResult.insertId);

                  const showtimeId = showtimeResult.insertId;
                  createShowtimeInventory(
  eventId,
  showtimeId
);

                }

              );

            }

          );

          res.json({

            message:
              "Tạo sự kiện thành công",

            event_id: eventId,

          });

        }

      );

    } catch (err) {

      console.log(err);

      res.status(500).json({

        message:
          "Server error",

      });

    }

  }

);

// ============================
// UPDATE EVENT
// ============================

router.put(
  "/:id",
  (req, res) => {

    const {
      category_id,
      title,
      description,
      location,
      showtimes,
      zones
    } = req.body;

    const sql = `

      UPDATE events

      SET

        category_id = ?,
        title = ?,
        description = ?,
        location = ?,
        status = 'PENDING'

      WHERE id = ?

    `;

    db.query(

      sql,

      [
        category_id,
        title,
        description,
        location,
        req.params.id,
      ],

      (err) => {

        if (err) {

          console.log(err);

          return res
            .status(500)
            .json({
              message:
                "Cập nhật thất bại",
            });

        }


let completedShowtimes = 0;

showtimes.forEach((st) => {

  db.query(

    `
      UPDATE showtimes
      SET
        start_time = ?,
        end_time = ?
      WHERE id = ?
    `,

    [
      st.start_time,
      st.end_time,
      st.id,
    ],

    (err2) => {

      if (err2) {
        console.log(err2);
      }

      completedShowtimes++;

      if (
  completedShowtimes ===
  showtimes.length
) {

  let completedZones = 0;

  if (!zones || zones.length === 0) {

    return res.json({
      message:
        "Cập nhật thành công",
    });

  }

  zones.forEach((zone) => {

    db.query(

      `
      UPDATE zones
      SET
        price = ?,
        capacity = ?,
        sale_start = ?,
        sale_end = ?
      WHERE id = ?
      `,

      [
        zone.price,
        zone.capacity,
        zone.sale_start,
        zone.sale_end,
        zone.id,
      ],

      (err3) => {

        if (err3) {
          console.log(err3);
        }

        completedZones++;

        if (
          completedZones ===
          zones.length
        ) {

          return res.json({
            message:
              "Cập nhật thành công",
          });

        }

      }

    );

  });

}

    }

  );

});

      }

    );

  }
);

// ============================
// CANCEL EVENT
// ============================

router.put(
  "/:id/cancel",
  (req, res) => {

    const sql = `

      UPDATE events

      SET status = 'CANCELLED'

      WHERE id = ?

    `;

    db.query(

      sql,

      [req.params.id],

      (err) => {

        if (err) {

          console.log(err);

          return res
            .status(500)
            .json({
              message:
                "Hủy sự kiện thất bại",
            });

        }

        res.json({
          message:
            "Đã hủy sự kiện",
        });

      }

    );

  }
);


// ============================
// ADMIN APPROVE EVENT
// ============================

router.put(
  "/:id/approve",
  (req, res) => {

    const sql = `

      UPDATE events

      SET status = 'APPROVED'

      WHERE id = ?

    `;

    db.query(

      sql,

      [req.params.id],

      (err) => {

        if (err) {

          console.log(err);

          return res
            .status(500)
            .json({
              message:
                "Duyệt sự kiện thất bại",
            });

        }

        res.json({
          message:
            "Đã duyệt sự kiện",
        });

      }

    );

  }
);


// ============================
// ADMIN REJECT EVENT
// ============================



// ============================
// ADMIN GET ALL EVENTS
// ============================

router.get(
  "/admin/all",
  (req, res) => {

    const sql = `

      SELECT

        events.*,

        categories.name
        AS category_name

      FROM events

      LEFT JOIN categories

      ON events.category_id =
      categories.id

      ORDER BY events.id DESC

    `;

    db.query(
      sql,
      (err, results) => {

        if (err) {

          console.log(err);

          return res
            .status(500)
            .json({
              message:
                "Lỗi server",
            });

        }

        res.json(results);

      }
    );

  }
);


module.exports = router;
