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

module.exports = router;