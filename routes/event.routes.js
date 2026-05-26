const express = require("express");

const router = express.Router();

const db = require("../db");

const multer = require("multer");

const path = require("path");


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
// GET ALL EVENTS
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

    ORDER BY events.id DESC

  `;

  db.query(sql, (err, results) => {

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

  });

});


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

            message:
              "Lỗi server",

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
// CREATE EVENT
// ============================

router.post(

  "/",

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

      } = req.body;

      // REQUIRE IMAGE
      if (!req.file) {

        return res
          .status(400)
          .json({

            message:
              "Banner là bắt buộc",

          });

      }

      // IMAGE URL
      const image_url =

        `/uploads/${req.file.filename}`;

      const sql = `

        INSERT INTO events

        (

          organizer_id,

          category_id,

          title,

          description,

          location,

          seat_mode,

          image_url

        )

        VALUES (?, ?, ?, ?, ?, ?, ?)

      `;

      db.query(

        sql,

        [

          organizer_id,

          category_id,

          title,

          description,

          location,

          seat_mode,

          image_url,

        ],

        (err, result) => {

          if (err) {

            console.log(err);

            return res
              .status(500)
              .json({

                message:
                  "Tạo sự kiện thất bại",

              });

          }

          res.json({

            message:
              "Tạo sự kiện thành công",

            event_id:
              result.insertId,

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
// ORGANIZER STATS
// ============================

router.get(
  "/organizer/:id/stats",
  (req, res) => {

    const organizerId =
      req.params.id;

    // TOTAL EVENTS
    const eventsSql = `
      SELECT COUNT(*) AS totalEvents
      FROM events
      WHERE organizer_id = ?
    `;

    db.query(

      eventsSql,

      [organizerId],

      (err, eventsResult) => {

        if (err) {

          return res
            .status(500)
            .json(err);

        }

        res.json({

          totalEvents:

            eventsResult[0]
              .totalEvents,

          totalTickets: 0,

          revenue: 0,

        });

      }

    );

  }
);

module.exports = router;