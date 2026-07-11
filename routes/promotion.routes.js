const express = require("express");

const router = express.Router();

const db = require("../db");

// ======================================
// GET ORGANIZER PROMOTIONS
// ======================================

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
      ORDER BY p.created_at DESC
    `;

    db.query(
      sql,
      [organizerId],
      (err, rows) => {

        if (err) {

          console.log(err);

          return res.status(500).json({
            success: false,
            message: "Server error",
          });

        }

        res.json(rows);

      }
    );

  }
);

// ======================================
// CREATE PROMOTION
// ======================================

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

    // ==========================
    // VALIDATE
    // ==========================

    if (
      !code ||
      !event_id
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Thiếu dữ liệu.",
      });

    }

    if (
      Number(discount_value) <= 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Giá trị giảm phải lớn hơn 0.",
      });

    }

    if (

      discount_type ===
        "PERCENT" &&

      Number(discount_value) >
        100

    ) {

      return res.status(400).json({
        success: false,
        message:
          "Giảm % không được lớn hơn 100.",
      });

    }

    if (
      Number(quantity) <= 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Số lượng phải lớn hơn 0.",
      });

    }

    if (

      new Date(end_date) <=
      new Date(start_date)

    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ngày kết thúc phải lớn hơn ngày bắt đầu.",

      });

    }

    // ==========================
    // CHECK DUPLICATE CODE
    // ==========================

    db.query(

      `
      SELECT id
      FROM promotions
      WHERE code = ?
      `,
      [code],

      (checkErr, rows) => {

        if (checkErr) {

          console.log(checkErr);

          return res.status(500).json({

            success: false,

            message:
              "Server error",

          });

        }

        if (rows.length) {

          return res.status(400).json({

            success: false,

            message:
              "Mã giảm giá đã tồn tại.",

          });

        }

        // ==========================
        // INSERT
        // ==========================

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

            end_date,

            status

          )

          VALUES

          (

            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE'

          )

        `;

        db.query(

          sql,

          [

            organizer_id,

            event_id,

            code.trim().toUpperCase(),

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

                success: false,

                message:
                  "Server error",

              });

            }

            res.json({

              success: true,

              id:
                result.insertId,

              message:
                "Tạo mã thành công.",

            });

          }

        );

      }

    );

  }

);
// ======================================
// UPDATE PROMOTION
// ======================================

router.put(
  "/:id",
  (req, res) => {

    const promotionId =
      req.params.id;

    const {

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

    // ==========================
    // VALIDATE
    // ==========================

    if (
      !code ||
      !event_id
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Thiếu dữ liệu.",
      });

    }

    if (
      Number(discount_value) <= 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Giá trị giảm phải lớn hơn 0.",
      });

    }

    if (

      discount_type ===
        "PERCENT" &&

      Number(discount_value) >
        100

    ) {

      return res.status(400).json({

        success: false,

        message:
          "Giảm % không được lớn hơn 100.",

      });

    }

    if (
      Number(quantity) <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Số lượng phải lớn hơn 0.",

      });

    }

    if (

      new Date(end_date) <=
      new Date(start_date)

    ) {

      return res.status(400).json({

        success: false,

        message:
          "Ngày kết thúc phải lớn hơn ngày bắt đầu.",

      });

    }

    // ==========================
    // GET CURRENT PROMOTION
    // ==========================

    db.query(

      `
      SELECT *
      FROM promotions
      WHERE id = ?
      `,
      [promotionId],

      (findErr, rows) => {

        if (findErr) {

          console.log(findErr);

          return res.status(500).json({

            success: false,

            message:
              "Server error",

          });

        }

        if (!rows.length) {

          return res.status(404).json({

            success: false,

            message:
              "Không tìm thấy mã giảm giá.",

          });

        }

        const promotion =
          rows[0];

        // ==========================
        // KHÔNG CHO SỬA
        // ĐÃ HẾT HẠN
        // ==========================

        if (

          new Date() >
          new Date(
            promotion.end_date
          )

        ) {

          return res.status(400).json({

            success: false,

            message:
              "Mã đã hết hạn, không thể chỉnh sửa.",

          });

        }

        // ==========================
        // KHÔNG CHO SỬA
        // ĐÃ DÙNG HẾT
        // ==========================

        if (

          promotion.used_count >=
          promotion.quantity

        ) {

          return res.status(400).json({

            success: false,

            message:
              "Mã đã sử dụng hết lượt.",

          });

        }

        // ==========================
        // KHÔNG CHO
        // quantity < used_count
        // ==========================

        if (

          Number(quantity) <
          promotion.used_count

        ) {

          return res.status(400).json({

            success: false,

            message:
              "Số lượng không được nhỏ hơn số lượt đã sử dụng.",

          });

        }

        // ==========================
        // CHECK DUPLICATE CODE
        // ==========================

        db.query(

          `
          SELECT id
          FROM promotions
          WHERE code = ?
          AND id <> ?
          `,

          [

            code,

            promotionId,

          ],

          (dupErr, dupRows) => {

            if (dupErr) {

              console.log(dupErr);

              return res.status(500).json({

                success: false,

                message:
                  "Server error",

              });

            }

            if (
              dupRows.length
            ) {

              return res.status(400).json({

                success: false,

                message:
                  "Mã giảm giá đã tồn tại.",

              });

            }

            // ==========================
            // UPDATE
            // ==========================

            const sql = `

              UPDATE promotions

              SET

                event_id = ?,

                code = ?,

                name = ?,

                description = ?,

                discount_type = ?,

                discount_value = ?,

                min_order_value = ?,

                max_discount = ?,

                quantity = ?,

                start_date = ?,

                end_date = ?

              WHERE id = ?

            `;

            db.query(

              sql,

              [

                event_id,

                code.trim().toUpperCase(),

                name,

                description,

                discount_type,

                discount_value,

                min_order_value,

                max_discount,

                quantity,

                start_date,

                end_date,

                promotionId,

              ],

              (err) => {

                if (err) {

                  console.log(err);

                  return res.status(500).json({

                    success: false,

                    message:
                      "Server error",

                  });

                }

                res.json({

                  success: true,

                  message:
                    "Cập nhật thành công.",

                });

              }

            );

          }

        );

      }

    );

  }

);
// ======================================
// APPLY PROMOTION
// ======================================

router.post(
  "/apply",
  (req, res) => {

    const {

      code,

      total_price,

      event_id,

    } = req.body;

    db.query(

      `
      SELECT *
      FROM promotions
      WHERE code = ?
      AND (
        event_id IS NULL
        OR event_id = ?
      )
      `,

      [

        code.trim().toUpperCase(),

        event_id,

      ],

      (err, rows) => {

        if (err) {

          console.log(err);

          return res.status(500).json({

            success:false,

            message:"Server error",

          });

        }

        if (!rows.length) {

          return res.status(404).json({

            success:false,

            message:"Mã không tồn tại.",

          });

        }

        const promo =
          rows[0];

        const now =
          new Date();

        // =======================
        // HẾT HẠN
        // =======================

        if (

          now >
          new Date(
            promo.end_date
          )

        ) {

          return res.status(400).json({

            success:false,

            message:"Mã đã hết hạn.",

          });

        }

        // =======================
        // CHƯA BẮT ĐẦU
        // =======================

        if (

          now <
          new Date(
            promo.start_date
          )

        ) {

          return res.status(400).json({

            success:false,

            message:"Mã chưa bắt đầu.",

          });

        }

        // =======================
        // HẾT LƯỢT
        // =======================

        if (

          promo.used_count >=
          promo.quantity

        ) {

          return res.status(400).json({

            success:false,

            message:"Mã đã hết lượt sử dụng.",

          });

        }

        // =======================
        // MIN ORDER
        // =======================

        if (

          Number(total_price) <
          Number(
            promo.min_order_value
          )

        ) {

          return res.status(400).json({

            success:false,

            message:
              "Đơn hàng chưa đạt giá trị tối thiểu.",

          });

        }

        // =======================
        // DISCOUNT
        // =======================

        let discount = 0;

        if (

          promo.discount_type ===
          "PERCENT"

        ) {

          discount =
            Number(total_price) *

            Number(
              promo.discount_value
            ) / 100;

          if (

            promo.max_discount &&

            discount >

            promo.max_discount

          ) {

            discount =
              Number(
                promo.max_discount
              );

          }

        }

        else {

          discount =
            Number(
              promo.discount_value
            );

        }

        if (

          discount >
          total_price

        ) {

          discount =
            total_price;

        }

        return res.json({

          success:true,

          promotion:promo,

          discount,

          final_price:

            Number(total_price) -

            discount,

        });

      }

    );

  }

);

module.exports = router;