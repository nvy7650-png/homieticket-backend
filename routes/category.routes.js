const express = require("express");

const router = express.Router();

const db = require("../db");

// GET CATEGORIES
router.get("/", (req, res) => {

  const sql =
    "SELECT * FROM categories";

  db.query(sql, (err, results) => {

    if (err) {

      return res
        .status(500)
        .json(err);

    }

    res.json(results);

  });

});

// UPDATE CATEGORY
router.put("/:id", (req, res) => {

  const { name, description } = req.body;

  const sql = `
    UPDATE categories
    SET
      name = ?,
      description = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [name, description, req.params.id],
    (err, result) => {

      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        message: "Cập nhật danh mục thành công"
      });

    }
  );

});

// CREATE CATEGORY
router.post("/", (req, res) => {
  // Kiểm tra trùng tên
const checkSql = `
  SELECT id
  FROM categories
  WHERE LOWER(name) = LOWER(?)
`;

db.query(checkSql, [name.trim()], (checkErr, rows) => {

  if (checkErr) {
    return res.status(500).json(checkErr);
  }

  if (rows.length > 0) {
    return res.status(400).json({
      message: "Tên danh mục đã tồn tại"
    });
  }

  const sql = `
    INSERT INTO categories
    (name, description)
    VALUES (?, ?)
  `;

  db.query(
    sql,
    [name.trim(), description],
    (err, result) => {

      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        message: "Thêm danh mục thành công",
        id: result.insertId,
      });

    }
  );

});

  const { name, description } = req.body;

  // Kiểm tra trùng tên (trừ chính nó)
const checkSql = `
  SELECT id
  FROM categories
  WHERE LOWER(name) = LOWER(?)
  AND id <> ?
`;

db.query(
  checkSql,
  [name.trim(), req.params.id],
  (checkErr, rows) => {

    if (checkErr) {
      return res.status(500).json(checkErr);
    }

    if (rows.length > 0) {
      return res.status(400).json({
        message: "Tên danh mục đã tồn tại"
      });
    }

    const sql = `
      UPDATE categories
      SET
        name = ?,
        description = ?
      WHERE id = ?
    `;

    db.query(
      sql,
      [
        name.trim(),
        description,
        req.params.id
      ],
      (err) => {

        if (err) {
          return res.status(500).json(err);
        }

        res.json({
          message: "Cập nhật danh mục thành công"
        });

      }
    );

  }
);

  const sql = `
    INSERT INTO categories
    (name, description)
    VALUES (?, ?)
  `;

  db.query(
    sql,
    [name, description],
    (err, result) => {

      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        message: "Thêm danh mục thành công",
        id: result.insertId,
      });

    }
  );

});
// DELETE CATEGORY
router.delete("/:id", (req, res) => {

  const sql =
    "DELETE FROM categories WHERE id = ?";

  db.query(
    sql,
    [req.params.id],
    (err) => {

      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        message: "Xóa danh mục thành công",
      });

    }
  );

});

module.exports = router;