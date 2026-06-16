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

              if (seat_id) {

                const updateSeatSql = `
                  UPDATE seats
                  SET status = 'HELD'
                  WHERE id = ?
                  AND status = 'AVAILABLE'
                `;

                db.query(updateSeatSql, [seat_id], (seatErr, seatResult) => {

                  if (seatErr) {

                    console.log(seatErr);

                    return db.rollback(() =>

                      res.status(500).json({ message: "Lỗi server" })

                    );

                  }

                  if (!seatResult || seatResult.affectedRows === 0) {

                    return db.rollback(() =>

                      res.status(400).json({

                        message: "Ghế đã được giữ hoặc đã bán",

                      })

                    );

                  }

                  processNext();

                });

              } else {

                processNext();

              }

            }

          );

        }

        processNext();

      }

    );

  });

});

module.exports = router;
