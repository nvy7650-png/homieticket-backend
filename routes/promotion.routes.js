const express = require("express");
const router = express.Router();
const db = require("../db");


// ======================
// GET ORGANIZER PROMOTIONS
// ======================

router.get(
  "/organizer/:organizerId",
  (req, res) => {

    const organizerId =
      req.params.organizerId;

    const sql = `
      SELECT
        p.*,

        e.title AS event_title

      FROM promotions p

      LEFT JOIN events e
      ON e.id = p.event_id

      WHERE p.organizer_id = ?

      ORDER BY p.id DESC
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


// ======================
// CREATE PROMOTION
// ======================

router.post(
  "/",
  (req, res) => {

    const {
      organizer_id,
      event_id,
      code,
      name,
      description,
      discount_type,
      discount_value,
      min_order_value,
      max_discount,
      quantity,
      start_date,
      end_date,
    } = req.body;

    const sql = `
      INSERT INTO promotions
      (
        organizer_id,
        event_id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        min_order_value,
        max_discount,
        quantity,
        start_date,
        end_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        organizer_id,
        event_id,
        code,
        name,
        description,
        discount_type,
        discount_value,
        min_order_value,
        max_discount,
        quantity,
        start_date,
        end_date,
      ],
      (err, result) => {

        if (err) {

          console.log(err);

          return res.status(500).json({
            message: "Server error",
          });

        }

        res.json({
          success: true,
          id: result.insertId,
        });

      }
    );

  }
);


// ======================
// UPDATE PROMOTION
// ======================

router.put(
  "/:id",
  (req, res) => {

    const promotionId =
      req.params.id;

    const {
      name,
      description,
      discount_type,
      discount_value,
      min_order_value,
      max_discount,
      quantity,
      start_date,
      end_date,
      status,
    } = req.body;

    const sql = `
      UPDATE promotions
      SET
        name = ?,
        description = ?,
        discount_type = ?,
        discount_value = ?,
        min_order_value = ?,
        max_discount = ?,
        quantity = ?,
        start_date = ?,
        end_date = ?,
        status = ?
      WHERE id = ?
    `;

    db.query(
      sql,
      [
        name,
        description,
        discount_type,
        discount_value,
        min_order_value,
        max_discount,
        quantity,
        start_date,
        end_date,
        status,
        promotionId,
      ],
      (err) => {

        if (err) {

          console.log(err);

          return res.status(500).json({
            message: "Server error",
          });

        }

        res.json({
          success: true,
        });

      }
    );

  }
);


// ======================
// DELETE PROMOTION
// ======================

router.delete(
  "/:id",
  (req, res) => {

    const sql = `
      DELETE
      FROM promotions
      WHERE id = ?
    `;

    db.query(
      sql,
      [req.params.id],
      (err) => {

        if (err) {

          console.log(err);

          return res.status(500).json({
            message: "Server error",
          });

        }

        res.json({
          success: true,
        });

      }
    );

  }
);


// ======================
// APPLY PROMOTION
// ======================

router.post(
  "/apply",
  (req, res) => {

    const {
      code,
      total_price,
      event_id,
    } = req.body;

    const sql = `
      SELECT *
      FROM promotions
      WHERE code = ?
      AND (
        event_id IS NULL
        OR event_id = ?
      )
    `;

    db.query(
      sql,
      [code, event_id],
      (err, rows) => {

        if (err) {
          console.log(err);

          return res.status(500).json({
            message: "Server error",
          });
        }

        if (!rows.length) {

          return res.status(404).json({
            success: false,
            message: "Mã không tồn tại",
          });

        }

        const promo = rows[0];

        const now = new Date();

        const startDate =
          new Date(promo.start_date);

        const endDate =
          new Date(promo.end_date);

        // Chưa bắt đầu

        if (now < startDate) {

          return res.status(400).json({
            success: false,
            message:
              "Mã chưa bắt đầu",
          });

        }

        // Hết hạn

        if (now > endDate) {

          db.query(
            `
            UPDATE promotions
            SET status = 'INACTIVE'
            WHERE id = ?
            `,
            [promo.id]
          );

          return res.status(400).json({
            success: false,
            message:
              "Mã đã hết hạn",
          });

        }

        // Bị tắt

        if (
          promo.status !==
          "ACTIVE"
        ) {

          return res.status(400).json({
            success: false,
            message:
              "Mã đã ngừng hoạt động",
          });

        }

        // Hết lượt dùng

        if (
          promo.used_count >=
          promo.quantity
        ) {

          db.query(
            `
            UPDATE promotions
            SET status = 'INACTIVE'
            WHERE id = ?
            `,
            [promo.id]
          );

          return res.status(400).json({
            success: false,
            message:
              "Mã đã hết lượt sử dụng",
          });

        }

        // Chưa đủ tiền

        if (
          total_price <
          promo.min_order_value
        ) {

          return res.status(400).json({
            success: false,
            message:
              "Chưa đạt giá trị tối thiểu",
          });

        }

        let discount = 0;

        if (
          promo.discount_type ===
          "PERCENT"
        ) {

          discount =
            total_price *
            promo.discount_value /
            100;

          if (
            promo.max_discount &&
            discount >
            promo.max_discount
          ) {

            discount =
              promo.max_discount;

          }

        } else {

          discount =
            promo.discount_value;

        }

        return res.json({
          success: true,
          promotion: promo,
          discount,
          final_price:
            total_price -
            discount,
        });

      }
    );

  }
);

module.exports = router;