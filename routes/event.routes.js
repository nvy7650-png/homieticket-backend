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
// GET EVENTS
// ============================

router.get("/", (req, res) => {

  const sql =
    "SELECT * FROM events";

  db.query(sql, (err, results) => {

    if (err) {

      return res
        .status(500)
        .json(err);

    }

    res.json(results);

  });

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
        title,
        description,
        location,
        event_type,

      } = req.body;

      // IMAGE URL
      const image_url =
        req.file
          ? `/uploads/${req.file.filename}`
          : null;

      const sql = `

        INSERT INTO events

        (

          organizer_id,
          title,
          description,
          location,
          event_type,
          image_url

        )

        VALUES (?, ?, ?, ?, ?, ?)

      `;

      db.query(

        sql,

        [

          organizer_id,
          title,
          description,
          location,
          event_type,
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

module.exports = router;