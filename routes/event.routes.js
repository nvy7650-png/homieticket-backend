const express = require("express");

const router = express.Router();

const db = require("../db");

const multer = require("multer");

const {
  storage,
} = require("../config/cloudinary");


const upload = multer({
  storage,
});


// ============================
// GET ALL APPROVED EVENTS
// HOMEPAGE
// ============================
router.get("/", (req, res) => {

  const categoryId =
    req.query.category;

  let sql = `
    SELECT
      e.*,
      c.name AS category_name,

      MIN(s.start_time) AS first_showtime,

      (
        SELECT MIN(z.price)
        FROM zones z
        WHERE z.event_id = e.id
      ) AS min_price

      ,

(
  SELECT COUNT(*)
  FROM tickets t
  WHERE
    t.event_id = e.id
    AND t.status = 'VALID'
) AS sold_count
 ,
(
  SELECT SUM(

    CASE

      WHEN z.zone_type = 'STANDING'
      THEN z.capacity

      ELSE z.total_rows * z.seats_per_row

    END

  )

  FROM zones z

  WHERE z.event_id = e.id

) AS total_capacity
 ,

(
  (
    SELECT COUNT(*)
    FROM tickets t
    WHERE
      t.event_id = e.id
      AND t.status = 'VALID'
  )

  /

  NULLIF(

    (
      SELECT SUM(

        CASE

          WHEN z.zone_type = 'STANDING'
          THEN z.capacity

          ELSE z.total_rows * z.seats_per_row

        END

      )

      FROM zones z

      WHERE z.event_id = e.id

    ),

    0

  )

) AS sold_rate

    FROM events e

    LEFT JOIN categories c
      ON e.category_id = c.id

    LEFT JOIN showtimes s
      ON s.event_id = e.id

    WHERE
  e.status = 'APPROVED'
  `;

  const params = [];

  if (categoryId) {

    sql += `
      AND e.category_id = ?
    `;

    params.push(categoryId);

  }

  sql += `
    GROUP BY e.id
    ORDER BY e.created_at DESC
  `;

  db.query(
    sql,
    params,
    (err, results) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Lỗi server",
        });

      }

      res.json(results);

    }
  );

});

router.get("/showtimes/:id/seats", (req, res) => {

  const sql = `
    SELECT

      sts.id AS showtime_seat_id,
      sts.status,

      s.id AS seat_id,
      s.seat_code,
      s.row_label,
      s.seat_number,

      z.id AS zone_id,
      z.name AS zone_name,
      z.price

    FROM showtime_seats sts

    JOIN seats s
      ON sts.seat_id = s.id

    JOIN zones z
      ON sts.zone_id = z.id

    WHERE sts.showtime_id = ?

    ORDER BY
      z.id,
      s.row_label,
      s.seat_number
  `;

  db.query(
    sql,
    [req.params.id],
    (err, results) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          message: "Lỗi server"
        });
      }

      res.json(results);

    }
  );

});

router.get("/hero", (req, res) => {

  const sql = `

  SELECT

  e.*,

  c.name AS category_name,

  MIN(s.start_time) AS first_showtime,

  (
    SELECT MIN(z.price)
    FROM zones z
    WHERE z.event_id = e.id
  ) AS min_price,

  (
    SELECT COUNT(*)
    FROM tickets t
    WHERE
      t.event_id = e.id
      AND t.status = 'VALID'
  ) AS sold_count,

  (
    SELECT SUM(

      CASE

        WHEN z.zone_type = 'STANDING'
        THEN z.capacity

        ELSE z.total_rows * z.seats_per_row

      END

    )

    FROM zones z

    WHERE z.event_id = e.id

  ) AS total_capacity,

  (

    (

      SELECT COUNT(*)

      FROM tickets t

      WHERE

        t.event_id = e.id

        AND t.status='VALID'

    )

    /

    NULLIF(

      (

        SELECT SUM(

          CASE

            WHEN z.zone_type='STANDING'

            THEN z.capacity

            ELSE z.total_rows * z.seats_per_row

          END

        )

        FROM zones z

        WHERE z.event_id=e.id

      ),

      0

    )

  ) AS sold_rate
   FROM events e

LEFT JOIN categories c
ON c.id = e.category_id

LEFT JOIN showtimes s
ON s.event_id = e.id
WHERE
  e.status = 'APPROVED'
  AND s.start_time > NOW()

GROUP BY
  e.id
  ORDER BY

  sold_rate DESC,

  first_showtime ASC

LIMIT 5
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

    const organizerId = req.params.id;

    const totalEventsSql = `
      SELECT COUNT(*) AS total
      FROM events
      WHERE organizer_id = ?
    `;

    const totalTicketsSql = `
      SELECT COUNT(*) AS total
      FROM tickets t
      INNER JOIN events e
        ON t.event_id = e.id
      WHERE e.organizer_id = ?
    `;

    const revenueSql = `
      SELECT COALESCE(SUM(o.total_price), 0) AS total
      FROM orders o
      INNER JOIN events e
        ON o.event_id = e.id
      WHERE e.organizer_id = ?
        AND o.status = 'PAID'
    `;

    const checkedInSql = `
      SELECT COUNT(*) AS total
      FROM tickets t
      INNER JOIN events e
        ON t.event_id = e.id
      WHERE e.organizer_id = ?
        AND t.status = 'USED'
    `;

    const eventRevenueSql = `
      SELECT
        e.id,
        e.title,
        COALESCE(
          SUM(
            CASE
              WHEN o.status = 'PAID'
              THEN o.total_price
              ELSE 0
            END
          ),
          0
        ) AS revenue
      FROM events e
      LEFT JOIN orders o
        ON o.event_id = e.id
      WHERE e.organizer_id = ?
      GROUP BY e.id, e.title
      ORDER BY revenue DESC
      LIMIT 5
    `;

    const eventTicketsSql = `
      SELECT
        e.id,
        e.title,
        COUNT(t.id) AS tickets
      FROM events e
      LEFT JOIN tickets t
        ON t.event_id = e.id
      WHERE e.organizer_id = ?
      GROUP BY e.id, e.title
      ORDER BY tickets DESC
      LIMIT 5
    `;

    db.query(
      totalEventsSql,
      [organizerId],
      (err1, eventsResult) => {

        if (err1) {
          console.log(err1);

          return res.status(500).json({
            message: "Lỗi lấy tổng sự kiện",
          });
        }

        db.query(
          totalTicketsSql,
          [organizerId],
          (err2, ticketsResult) => {

            if (err2) {
              console.log(err2);

              return res.status(500).json({
                message: "Lỗi lấy tổng vé",
              });
            }

            db.query(
              revenueSql,
              [organizerId],
              (err3, revenueResult) => {

                if (err3) {
                  console.log(err3);

                  return res.status(500).json({
                    message: "Lỗi lấy doanh thu",
                  });
                }

                db.query(
                  checkedInSql,
                  [organizerId],
                  (err4, checkedInResult) => {

                    if (err4) {
                      console.log(err4);

                      return res.status(500).json({
                        message: "Lỗi lấy check-in",
                      });
                    }

                    db.query(
                      eventRevenueSql,
                      [organizerId],
                      (err5, eventRevenueResult) => {

                        if (err5) {
                          console.log(err5);

                          return res.status(500).json({
                            message: "Lỗi lấy doanh thu theo sự kiện",
                          });
                        }

                        db.query(
                          eventTicketsSql,
                          [organizerId],
                          (err6, eventTicketsResult) => {

                            if (err6) {
                              console.log(err6);

                              return res.status(500).json({
                                message: "Lỗi lấy vé theo sự kiện",
                              });
                            }

                            res.json({

                              totalEvents:
                                Number(
                                  eventsResult[0]?.total || 0
                                ),

                              totalTickets:
                                Number(
                                  ticketsResult[0]?.total || 0
                                ),

                              revenue:
                                Number(
                                  revenueResult[0]?.total || 0
                                ),

                              checkedIn:
                                Number(
                                  checkedInResult[0]?.total || 0
                                ),

                              eventRevenue:
                                eventRevenueResult.map(
                                  (item) => ({
                                    id: item.id,
                                    title: item.title,
                                    revenue:
                                      Number(
                                        item.revenue || 0
                                      ),
                                  })
                                ),

                              eventTickets:
                                eventTicketsResult.map(
                                  (item) => ({
                                    id: item.id,
                                    title: item.title,
                                    tickets:
                                      Number(
                                        item.tickets || 0
                                      ),
                                  })
                                ),

                            });

                          }
                        );

                      }
                    );

                  }
                );

              }
            );

          }
        );

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



router.get("/:id/showtimes", (req, res) => {

  const sql = `
    SELECT
      id,
      start_time,
      end_time
    FROM showtimes
    WHERE event_id = ?
    ORDER BY start_time
  `;

  db.query(
    sql,
    [req.params.id],
    (err, results) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          message: "Lỗi server"
        });
      }

      res.json(results);

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
  req.file.path;

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
for (const zone of parsedZones) {

  if (Number(zone.price) < 0) {
    return res.status(400).json({
      message: "Giá vé không được nhỏ hơn 0."
    });
  }

  if (zone.zone_type === "STANDING") {

    if (Number(zone.capacity) < 0) {
      return res.status(400).json({
        message: "Số lượng vé không được nhỏ hơn 0."
      });
    }

  } else {

    if (
      Number(zone.rows) < 0 ||
      Number(zone.seatsPerRow) < 0
    ) {
      return res.status(400).json({
        message: "Số hàng và số ghế mỗi hàng không được nhỏ hơn 0."
      });
    }

  }

}

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

  const startTime = st.start_time
  ? new Date(st.start_time)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ")
  : null;

const endTime = st.end_time
  ? new Date(st.end_time)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ")
  : null;
  db.query(

    `
      UPDATE showtimes
      SET
        start_time = ?,
        end_time = ?
      WHERE id = ?
    `,

    [
      startTime,
      endTime,
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

  console.log("========== UPDATE ZONE ==========");
  console.log("Zone ID:", zone.id);
  console.log("New Price:", zone.price);

  const saleStart = zone.sale_start
  ? new Date(zone.sale_start)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ")
  : null;

const saleEnd = zone.sale_end
  ? new Date(zone.sale_end)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ")
  : null;

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
      saleStart,
      saleEnd,
      zone.id,
    ],
    (err3, result) => {

      if (err3) {
        console.log(err3);
        return;
      }

      console.log("Affected Rows:", result.affectedRows);

      completedZones++;

      if (completedZones === zones.length) {

        return res.json({
          message: "Cập nhật thành công",
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
SET
  status = 'APPROVED',
  approved_at = NOW()
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

// GET organizer events
router.get(
  "/organizer/:organizerId",
  (req, res) => {

    const organizerId =
      req.params.organizerId;

    const sql = `
      SELECT
        id,
        title
      FROM events
      WHERE organizer_id = ?
      AND status = 'APPROVED'
      ORDER BY id DESC
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
