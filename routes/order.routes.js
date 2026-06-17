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

            const zone_id = it.zone_id || null;

            const seat_id = it.seat_id || null;

            const quantity = Number(it.quantity || 0);

            const price = Number(it.price || 0);

            const insertItemSql = `
              INSERT INTO order_items
                (order_id, zone_id, seat_id, quantity, price)
              VALUES (?, ?, ?, ?, ?)
            `;

            db.query(
              insertItemSql,
              [orderId, zone_id, seat_id, quantity, price],
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

module.exports = router;
