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

module.exports = router;