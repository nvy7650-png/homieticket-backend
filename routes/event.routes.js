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

      events.*,

      categories.name
      AS category_name

    FROM events

    LEFT JOIN categories

    ON events.category_id =
    categories.id

    WHERE events.status = 'APPROVED'

    ORDER BY events.id DESC

  `;

  db.query(sql, (err, results) => {

    if (err) {

      console.log(err);

      return res
        .status(500)
        .json({
          message: "Lỗi server",
        });

    }

    res.json(results);

  });

});


// ============================
// ORGANIZER EVENTS
// ============================

router.get(
  "/organizer/:id",
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

      WHERE organizer_id = ?

      ORDER BY events.id DESC

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
// GET SINGLE EVENT
// ============================

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

router.post(

  "/create-full",

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

          // PARSE SHOWTIMES
          const parsedShowtimes =
            JSON.parse(showtimes);

          // LOOP SHOWTIMES
          parsedShowtimes.forEach(
            (showtime) => {

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

                  showtime.start_time,

                  showtime.end_time,

                ],

                (

                  err,

                  showtimeResult

                ) => {

                  if (err) {

                    console.log(err);

                    return;

                  }

                  const showtimeId =
                    showtimeResult.insertId;

                  // LOOP TICKETS
                  showtime.tickets.forEach(
                    (ticket) => {

                      const ticketSql = `

                        INSERT INTO ticket_types

                        (

                          showtime_id,

                          name,

                          price,

                          quantity,

                          sale_start,

                          sale_end

                        )

                        VALUES (?, ?, ?, ?, ?, ?)

                      `;

                      db.query(

                        ticketSql,

                        [

                          showtimeId,

                          ticket.name,

                          ticket.price,

                          ticket.quantity,

                          ticket.sale_start,

                          ticket.sale_end,

                        ]

                      );

                    }

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

router.put(
  "/:id/reject",
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
                "Từ chối sự kiện thất bại",
            });

        }

        res.json({
          message:
            "Đã từ chối sự kiện",
        });

      }

    );

  }
);


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
