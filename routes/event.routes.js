const express = require("express");

const router = express.Router();

const db = require("../db");


// ===================================
// GET ALL EVENTS
// ===================================
router.get("/", (req, res) => {

  const sql = `
    SELECT *
    FROM events
    ORDER BY created_at DESC
  `;

  db.query(sql, (err, results) => {

    if (err) {

      return res.status(500).json({
        message: "Lỗi server",
      });

    }

    res.json(results);

  });

});


// ===================================
// GET SINGLE EVENT
// ===================================
router.get("/:id", (req, res) => {

  const { id } = req.params;

  const sql = `
    SELECT *
    FROM events
    WHERE id = ?
  `;

  db.query(sql, [id], (err, results) => {

    if (err) {

      return res.status(500).json({
        message: "Lỗi server",
      });

    }

    if (results.length === 0) {

      return res.status(404).json({
        message: "Không tìm thấy sự kiện",
      });

    }

    res.json(results[0]);

  });

});


// ===================================
// CREATE EVENT
// ===================================
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

  // VALIDATE
  if (
    !organizer_id ||
    !title ||
    !start_date
  ) {

    return res.status(400).json({
      message: "Thiếu dữ liệu",
    });

  }

  const sql = `
    INSERT INTO events
    (
      organizer_id,
      title,
      description,
      location,
      image_url,
      start_date,
      end_date
    )
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

        console.log(err);

        return res.status(500).json({
          message: "Tạo sự kiện thất bại",
        });

      }

      res.json({
        message: "Tạo sự kiện thành công",
        event_id: result.insertId,
      });

    }
  );

});


// ===================================
// UPDATE EVENT
// ===================================
router.put("/:id", (req, res) => {

  const { id } = req.params;

  const {
    title,
    description,
    location,
    image_url,
    start_date,
    end_date,
  } = req.body;

  const sql = `
    UPDATE events
    SET
      title = ?,
      description = ?,
      location = ?,
      image_url = ?,
      start_date = ?,
      end_date = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      title,
      description,
      location,
      image_url,
      start_date,
      end_date,
      id,
    ],
    (err, result) => {

      if (err) {

        return res.status(500).json({
          message: "Cập nhật thất bại",
        });

      }

      res.json({
        message: "Cập nhật sự kiện thành công",
      });

    }
  );

});


// ===================================
// DELETE EVENT
// ===================================
router.delete("/:id", (req, res) => {

  const { id } = req.params;

  const sql = `
    DELETE FROM events
    WHERE id = ?
  `;

  db.query(sql, [id], (err, result) => {

    if (err) {

      return res.status(500).json({
        message: "Xóa sự kiện thất bại",
      });

    }

    res.json({
      message: "Xóa sự kiện thành công",
    });

  });

});


module.exports = router;