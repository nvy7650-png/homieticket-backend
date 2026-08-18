const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/orders
router.post("/", (req, res) => {
  const { user_id, event_id, showtime_id, promotion_id, items } = req.body || {};

  if (!user_id || !event_id || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
  }

  const hasInvalidItem = items.some((item) => {
    const quantity = Number(item && item.quantity);
    const price = Number(item && item.price);
    return !item || !Number.isFinite(quantity) || !Number.isFinite(price) || quantity <= 0 || price < 0;
  });

  if (hasInvalidItem) {
    return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
  }

  const originalTotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
  const hasPromotion = promotion_id !== undefined && promotion_id !== null && promotion_id !== "";
  const seatItems = items.filter((item) => item.seat_id);
  let promotion = null;
  let discountAmount = 0;
  let finalTotal = originalTotal;

  function validatePromotion(callback) {
  if (!hasPromotion) return callback();

  db.query(
    `
    SELECT
      *,
      CASE
        WHEN start_date > NOW()
          THEN 'NOT_STARTED'

        WHEN end_date < NOW()
          THEN 'EXPIRED'

        WHEN quantity IS NOT NULL
          AND used_count >= quantity
          THEN 'SOLD_OUT'

        ELSE 'ACTIVE'
      END AS promotion_status

    FROM promotions

    WHERE id = ?

    AND (
      event_id IS NULL
      OR event_id = ?
    )
    `,
    [
      promotion_id,
      event_id,
    ],
    (err, rows) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Lỗi server",
        });

      }

      if (!rows.length) {

        return res.status(400).json({
          message: "Mã giảm giá không tồn tại",
        });

      }

      promotion = rows[0];

      const minOrder = Number(
        promotion.min_order ??
        promotion.min_order_value ??
        0
      );


      // =========================
      // KIỂM TRA THỜI GIAN
      // =========================

      if (
        promotion.promotion_status ===
        "NOT_STARTED"
      ) {

        return res.status(400).json({
          message: "Mã giảm giá chưa bắt đầu",
        });

      }


      if (
        promotion.promotion_status ===
        "EXPIRED"
      ) {

        return res.status(400).json({
          message: "Mã giảm giá đã hết hạn",
        });

      }


      // =========================
      // HẾT LƯỢT
      // =========================

      if (
        promotion.promotion_status ===
        "SOLD_OUT"
      ) {

        return res.status(400).json({
          message:
            "Mã giảm giá đã hết lượt sử dụng",
        });

      }


      // =========================
      // KIỂM TRA TRẠNG THÁI
      // =========================

      if (
        promotion.status &&
        promotion.status !== "ACTIVE"
      ) {

        return res.status(400).json({
          message:
            "Mã giảm giá không còn hoạt động",
        });

      }


      // =========================
      // GIÁ TRỊ ĐƠN TỐI THIỂU
      // =========================

      if (
        minOrder > 0 &&
        originalTotal < minOrder
      ) {

        return res.status(400).json({

          message:
            `Đơn hàng phải từ ${minOrder.toLocaleString(
              "vi-VN"
            )}đ để sử dụng mã này`,

        });

      }


      // =========================
      // TÍNH GIẢM GIÁ
      // =========================

      if (
        promotion.discount_type ===
        "PERCENT"
      ) {

        discountAmount =
          (
            originalTotal *
            Number(
              promotion.discount_value || 0
            )
          ) / 100;

      }

      else if (
        promotion.discount_type ===
        "FIXED"
      ) {

        discountAmount =
          Number(
            promotion.discount_value || 0
          );

      }

      else {

        return res.status(400).json({
          message:
            "Mã giảm giá không hợp lệ",
        });

      }


      // =========================
      // GIẢM TỐI ĐA
      // =========================

      if (
        promotion.max_discount !== null &&
        promotion.max_discount !== undefined &&
        discountAmount >
          Number(
            promotion.max_discount
          )
      ) {

        discountAmount =
          Number(
            promotion.max_discount
          );

      }


      // =========================
      // KHÔNG GIẢM QUÁ GIÁ ĐƠN
      // =========================

      discountAmount =
        Math.max(
          0,
          Math.min(
            discountAmount,
            originalTotal
          )
        );


      finalTotal =
        originalTotal -
        discountAmount;


      callback();

    }
  );
}

  function checkNextSeatHold(index = 0) {
    if (index >= seatItems.length) return proceedCreateOrder();

    const item = seatItems[index];
    const itemShowtimeId = item.showtime_id || showtime_id;
    if (!itemShowtimeId) {
      return res.status(400).json({ message: "Missing showtime_id for selected seat" });
    }

    db.query(
      `
        SELECT *
        FROM ticket_holds
        WHERE seat_id = ?
          AND showtime_id = ?
          AND status = 'ACTIVE'
          AND expires_at > NOW()
          AND user_id <> ?
      `,
      [item.seat_id, itemShowtimeId, user_id],
      (err, rows) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "Lỗi server" });
        }

        if (rows.length) {
          return res.status(409).json({
            message: "Một hoặc nhiều ghế đang được người khác giữ",
          });
        }

        checkNextSeatHold(index + 1);
      }
    );
  }

  function proceedCreateOrder() {
    db.beginTransaction((txErr) => {
      if (txErr) {
        console.log(txErr);
        return res.status(500).json({ message: "Lỗi server" });
      }

      function rollbackAndRespond(status, payload) {
        return db.rollback(() => res.status(status).json(payload));
      }

      function createOrder() {
        const insertOrderSql = `
          INSERT INTO orders
          (user_id, event_id, showtime_id, promotion_id, total_price, status)
          VALUES (?, ?, ?, ?, ?, 'PENDING')
        `;

        db.query(
          insertOrderSql,
          [user_id, event_id, showtime_id, hasPromotion ? promotion.id : null, finalTotal],
          (err, result) => {
            if (err) {
              console.log(err);
              return rollbackAndRespond(500, { message: "Lỗi server" });
            }

            insertOrderItems(result.insertId, 0);
          }
        );
      }

      function insertOrderItems(orderId, index) {
        if (index >= items.length) {

  if (!hasPromotion) {
    

    return db.commit((commitErr) => {

      if (commitErr) {

        console.log(commitErr);

        return rollbackAndRespond(500, {
          message: "Lỗi server",
        });

      }

      return res.json({

        order_id: orderId,
        total_price: finalTotal,
        discount: discountAmount,

      });

    });

  }

}
        const item = items[index];
        const insertItemSql = `
          INSERT INTO order_items
          (order_id, showtime_id, zone_id, seat_id, quantity, price)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertItemSql,
          [
            orderId,
            item.showtime_id || showtime_id,
            item.zone_id || null,
            item.seat_id || null,
            Number(item.quantity),
            Number(item.price),
          ],
          (itemErr) => {
            if (itemErr) {
              console.log(itemErr);
              return rollbackAndRespond(500, { message: "Lỗi server" });
            }

            insertOrderItems(orderId, index + 1);
          }
        );
      }

      createOrder();
    });
  }

  validatePromotion(() => checkNextSeatHold());
});
// GET /api/orders/:id
router.get("/:id", (req, res) => {

  const orderId = req.params.id;

  const sql = `
    SELECT
      o.id,
      o.total_price,
      o.status,

      e.id AS event_id,
      e.title AS event_title,

      z.id AS zone_id,
      z.name AS zone_name,

      oi.quantity,

      s.id AS seat_id,
      s.seat_code

    FROM orders o

    LEFT JOIN order_items oi
      ON oi.order_id = o.id

    LEFT JOIN seats s
      ON s.id = oi.seat_id

    LEFT JOIN zones z
      ON z.id = oi.zone_id

    LEFT JOIN events e
      ON e.id = o.event_id

    WHERE o.id = ?
  `;

  db.query(
    sql,
    [orderId],
    (err, rows) => {

      if (err) {

        console.log(err);

        return res.status(500).json({
          message: "Lỗi server",
        });

      }

      if (!rows.length) {

        return res.status(404).json({
          message: "Không tìm thấy đơn hàng",
        });

      }

      const first = rows[0];

      const seats = rows
  .filter(
    (row) => row.seat_id
  )
  .map((row) => ({
    id: row.seat_id,
    seat_code:
      row.seat_code,
  }));

const quantity =
  rows.reduce(
    (sum, row) =>
      sum +
      Number(
        row.quantity || 0
      ),
    0
  );

return res.json({
  id: first.id,
  total_price:
    first.total_price,

  status:
    first.status,

  event: {
    id: first.event_id,
    title:
      first.event_title,
  },

  zone: {
    id: first.zone_id,
    name:
      first.zone_name,
  },

  quantity,

  seats,
});

    }
  );

});

router.get(
  "/my-orders/:userId",
  (req, res) => {

    const sql = `
      SELECT

        o.id,
        o.total_price,
        o.status,
        o.created_at,

        e.id AS event_id,
        e.title AS event_title

      FROM orders o

      LEFT JOIN events e
      ON o.event_id = e.id

      WHERE o.user_id = ?

      ORDER BY o.id DESC
    `;

    db.query(
      sql,
      [req.params.userId],
      (err, result) => {

        if (err) {

          console.log(err);

          return res.status(500).json({
            message: "Server error",
          });

        }

        res.json(result);

      }
    );

  }
);

// POST /api/orders/:id/pay
router.post("/:id/pay", (req, res) => {

  const orderId = req.params.id;

  db.beginTransaction((txErr) => {

    if (txErr) {
      console.log(txErr);
      return res.status(500).json({
        message: "Lỗi server",
      });
    }

    const orderSql = `
      SELECT *
      FROM orders
      WHERE id = ?
    `;

    db.query(
      orderSql,
      [orderId],
      (orderErr, orderRows) => {

        if (orderErr) {

          console.log(orderErr);

          return db.rollback(() =>
            res.status(500).json({
              message: "Lỗi server",
            })
          );

        }

        if (!orderRows.length) {

          return db.rollback(() =>
            res.status(404).json({
              message: "Không tìm thấy đơn hàng",
            })
          );

        }

        const order = orderRows[0];

        if (order.status === "PAID") {

          return db.rollback(() =>
            res.json({
              message: "Đơn hàng đã thanh toán",
            })
          );

        }

        const itemsSql = `
          SELECT *
          FROM order_items
          WHERE order_id = ?
        `;

        db.query(
          itemsSql,
          [orderId],
          (itemErr, items) => {

            if (itemErr) {

              console.log(itemErr);

              return db.rollback(() =>
                res.status(500).json({
                  message: "Lỗi server",
                })
              );

            }

            const updateOrderSql = `
              UPDATE orders
              SET status = 'PAID'
              WHERE id = ?
            `;

            db.query(
              updateOrderSql,
              [orderId],
              (updateErr) => {

                if (updateErr) {

                  console.log(updateErr);

                  return db.rollback(() =>
                    res.status(500).json({
                      message: "Lỗi server",
                    })
                  );

                }

                let idx = 0;

                function processNextItem() {

                  if (idx >= items.length) {

                   const deleteHoldSql = `
  DELETE FROM ticket_holds
  WHERE user_id = ?
  AND event_id = ?
  AND showtime_id IN (
    SELECT DISTINCT showtime_id
    FROM order_items
    WHERE order_id = ?
  )
`;

                    return db.query(
  deleteHoldSql,
                      [
                        order.user_id,
                        order.event_id,
                        orderId,
                      ],
                      (holdErr) => {

                        if (holdErr) {

                          console.log(holdErr);

                          return db.rollback(() =>
                            res.status(500).json({
                              message: "Lỗi server",
                            })
                          );

                        }

                        db.commit((commitErr) => {

                          if (commitErr) {

                            console.log(commitErr);

                            return db.rollback(() =>
                              res.status(500).json({
                                message: "Lỗi server",
                              })
                            );

                          }

                          return res.json({
                            message:
                              "Thanh toán thành công",
                          });

                        });

                      }
                    );

                  }

                  const item = items[idx++];

                  const soldSql = `
                    UPDATE showtime_seats
                    SET status = 'SOLD'
                    WHERE showtime_id = ?
                    AND seat_id = ?
                  `;

                  db.query(
                    soldSql,
                    [
                      item.showtime_id,
                      item.seat_id,
                    ],
                    (soldErr) => {

                      if (soldErr) {

                        console.log(soldErr);

                        return db.rollback(() =>
                          res.status(500).json({
                            message: "Lỗi server",
                          })
                        );

                      }

                      const ticketCode =
                        `HMT-${orderId}-${item.seat_id}-${Date.now()}`;


                      const insertTicketSql = `
                        INSERT INTO tickets
                        (
                          order_item_id,
                          event_id,
                          showtime_id,
                          user_id,
                          zone_id,
                          seat_id,
                          ticket_code,
                          status
                        )
                        VALUES
                        (
                          ?, ?, ?, ?, ?, ?, ?, 'VALID'
                        )
                      `;

                      db.query(
                        insertTicketSql,
                        [
                          item.id,
                          order.event_id,
                          item.showtime_id,
                          order.user_id,
                          item.zone_id,
                          item.seat_id,
                          ticketCode,
                        ],
                        (ticketErr) => {

                          if (ticketErr) {

                            console.log(ticketErr);

                            return db.rollback(() =>
                              res.status(500).json({
                                message: "Lỗi server",
                              })
                            );

                          }

                          processNextItem();

                        }
                      );

                    }
                  );

                }

                processNextItem();

              }
            );

          }
        );

      }
    );

  });

});


module.exports = router;
