const express = require("express");
const router = express.Router();
const db = require("../db");


// POST /api/orders
// body: { user_id, event_id, items: [{ zone_id, seat_id, quantity, price }] }
router.post("/", (req, res) => {

  const { user_id, event_id, items } = req.body || {};

  if (!user_id || !event_id || !Array.isArray(items) || items.length === 0) {

    return res
      .status(400)
      .json({ message: "Dữ liệu không hợp lệ" });

  }

  const total_price = items.reduce((sum, it) => {

    const q = Number(it.quantity || 0);

    const p = Number(it.price || 0);

    return sum + q * p;

  }, 0);

  // Before creating order: ensure no selected seat is actively held by another user
  const seatItems = items.filter((it) => it && it.seat_id);

  let sIdx = 0;

  function checkNextSeatHold() {
    if (sIdx >= seatItems.length) {
      // all seats passed validation -> proceed to create order
      return proceedCreateOrder();
    }

    const it = seatItems[sIdx++];
    const seat_id = it.seat_id;
    const showtime_id = it.showtime_id || req.body.showtime_id;

    if (!showtime_id) {
      return res.status(400).json({ message: 'Missing showtime_id for selected seat' });
    }

    const checkHoldSql = `
      SELECT *
      FROM ticket_holds
      WHERE seat_id = ?
        AND showtime_id = ?
        AND status = 'ACTIVE'
        AND expires_at > NOW()
        AND user_id <> ?
    `;

    db.query(checkHoldSql, [seat_id, showtime_id, user_id], (hErr, hRes) => {
      if (hErr) {
        console.log(hErr);
        return res.status(500).json({ message: 'Lỗi server' });
      }

      if (hRes && hRes.length > 0) {
        return res.status(409).json({ message: 'Một hoặc nhiều ghế đang được người khác giữ' });
      }

      checkNextSeatHold();
    });
  }

  // proceedCreateOrder will contain the existing transaction logic
  function proceedCreateOrder() {
    // Start transaction
    db.beginTransaction((txErr) => {

      if (txErr) {

        console.log(txErr);

        return res.status(500).json({ message: "Lỗi server" });

      }

      const insertOrderSql = `
        INSERT INTO orders
          (user_id, event_id, total_price, status)
        VALUES (?, ?, ?, 'PENDING')
      `;

      db.query(
        insertOrderSql,
        [user_id, event_id, total_price],
        (err, result) => {

          if (err) {

            console.log(err);

            return db.rollback(() =>

              res.status(500).json({ message: "Lỗi server" })

            );

          }

          const orderId = result.insertId;

          let idx = 0;

          function processNext() {

            if (idx >= items.length) {

              return db.commit((commitErr) => {

                if (commitErr) {

                  console.log(commitErr);

                  return db.rollback(() =>

                    res.status(500).json({ message: "Lỗi server" })

                  );

                }

                res.json({ order_id: orderId, total_price });

              });

            }

            const it = items[idx++];

            const showtime_id =
  it.showtime_id || null;

const zone_id =
  it.zone_id || null;

const seat_id =
  it.seat_id || null;

const quantity =
  Number(it.quantity || 0);

const price =
  Number(it.price || 0);

            const insertItemSql = `
  INSERT INTO order_items
  (
    order_id,
    showtime_id,
    zone_id,
    seat_id,
    quantity,
    price
  )
  VALUES (?, ?, ?, ?, ?, ?)
`;

            db.query(
              insertItemSql,
              [orderId,
  showtime_id,
  zone_id,
  seat_id,
  quantity,
  price],
              (itemErr) => {

                if (itemErr) {

                  console.log(itemErr);

                  return db.rollback(() =>

                    res.status(500).json({ message: "Lỗi server" })

                  );

                }
                  processNext();

              }

            );

          }

          processNext();

        }

      );

    });
  }

  // start seat hold checks
  checkNextSeatHold();

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

      return res.json({
        id: first.id,
        total_price: first.total_price,
        status: first.status,

        event: {
          id: first.event_id,
          title: first.event_title,
        },

        zone: {
          id: first.zone_id,
          name: first.zone_name,
        },

        seats: rows.map((row) => ({
          id: row.seat_id,
          seat_code: row.seat_code,
        })),
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
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.created_at,

        e.id AS event_id,
        e.title AS event_title,
        e.image_url

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

                    const confirmHoldSql = `
                      UPDATE ticket_holds
                      SET status = 'CONFIRMED'
                      WHERE user_id = ?
                      AND event_id = ?
                      AND showtime_id IN (
                        SELECT DISTINCT showtime_id
                        FROM order_items
                        WHERE order_id = ?
                      )
                      AND status = 'ACTIVE'
                    `;

                    return db.query(
                      confirmHoldSql,
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

                      const qrCode =
                        ticketCode;

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
                          qr_code,
                          status
                        )
                        VALUES
                        (
                          ?, ?, ?, ?, ?, ?, ?, ?, 'VALID'
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
                          qrCode,
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
