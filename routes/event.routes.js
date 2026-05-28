const express = require("express");

const router = express.Router();

const db = require("../db");

const multer = require("multer");

const path = require("path");

const fs = require("fs");


// ============================
// CREATE UPLOADS FOLDER
// ============================

if (
  !fs.existsSync("uploads")
) {

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

          message:
            "Lỗi server",

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

              message:
                "Lỗi server",

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
// CREATE EVENT (STEP 1)
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

      // VALIDATE
      if (
        !organizer_id ||
        !title ||
        !location
      ) {

        return res
          .status(400)
          .json({

            message:
              "Thiếu thông tin bắt buộc",

          });

      }

      // REQUIRE IMAGE
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

      const sql = `

        INSERT INTO events

        (

          organizer_id,

          category_id,

          title,

          description,

          location,

          seat_mode,

          image_url,

          status

        )

        VALUES (?, ?, ?, ?, ?, ?, ?, ?)

      `;

      db.query(

        sql,

        [

          organizer_id,

          category_id || null,

          title,

          description || null,

          location,

          seat_mode || "MANUAL",

          image_url,

          "DRAFT",

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
// COMPLETE EVENT
// STEP 3
// ============================

router.put(
  "/:id/submit",
  (req, res) => {

    const sql = `

      UPDATE events

      SET status = 'PENDING'

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
                "Lỗi submit event",

            });

        }

        res.json({

          message:
            "Đã gửi xét duyệt",

        });

      }

    );

  }
);

module.exports = router;