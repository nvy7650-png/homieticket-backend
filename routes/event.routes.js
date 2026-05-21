const express = require("express");
const router = express.Router();
const db = require("../db");

// test route
router.get("/", (req, res) => {
  const sql = "SELECT * FROM events";

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
  });
});
// CREATE EVENT
router.post("/", (req, res) => {
  const {
    organizer_id,
    title,
    description,
    location,
    image_url,
    start_date,
    end_date,
  } = req.body;

  const sql = `
    INSERT INTO events 
    (organizer_id, title, description, location, image_url, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      organizer_id,
      title,
      description,
      location,
      image_url,
      start_date,
      end_date,
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        message: "Tạo event thành công",
        event_id: result.insertId,
      });
    }
  );
});

module.exports = router;