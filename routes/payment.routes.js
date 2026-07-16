const express =
  require("express");

const crypto =
  require("crypto");

const qs =
  require("qs");

const moment =
  require("moment");

const db =
  require("../db");

const mailService =
  require("../services/mail.service");

const sendTicketMail =
  mailService.sendTicketMail;

const router =
  express.Router();

function sortObject(obj) {

  const sorted = {};

  const keys =
    Object.keys(obj).sort();

  for (const key of keys) {

    sorted[
      encodeURIComponent(key)
    ] =
      encodeURIComponent(obj[key])
        .replace(/%20/g, "+");

  }

  return sorted;

}

function query(sql, params = []) {

  return new Promise(
    (resolve, reject) => {

      db.query(

        sql,

        params,

        (error, results) => {

          if (
            error
          ) {

            reject(error);

            return;

          }

          resolve(results);

        }

      );

    }
  );

}

function beginTransaction() {

  return new Promise(
    (resolve, reject) => {

      db.beginTransaction(
        (error) => {

          if (
            error
          ) {

            reject(error);

            return;

          }

          resolve();

        }
      );

    }
  );

}

function commit() {

  return new Promise(
    (resolve, reject) => {

      db.commit(
        (error) => {

          if (
            error
          ) {

            reject(error);

            return;

          }

          resolve();

        }
      );

    }
  );

}

function rollback() {

  return new Promise(
    (resolve) => {

      db.rollback(resolve);

    }
  );

}

function createTicket(order, ticketData) {

  return query(
    `
    INSERT INTO tickets (
      order_item_id,
      event_id,
      showtime_id,
      user_id,
      zone_id,
      seat_id,
      ticket_code,
      status,
      standing_number
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'VALID', ?)
    `,
    [
      ticketData.orderItemId,
      order.event_id,
      order.showtime_id,
      order.user_id,
      ticketData.zoneId,
      ticketData.seatId || null,
      crypto.randomUUID(),
      ticketData.standingNumber || null,
    ]
  );

}

router.post(
  "/create",
  (req, res) => {

    const {
      orderId,
      amount,
    } = req.body;

    if (
      !orderId ||
      !amount
    ) {

      return res
        .status(400)
        .json({
          message:
            "Thiếu dữ liệu",
        });

    }

    let ipAddr =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      req.ip ||
      "127.0.0.1";

    ipAddr =
      String(ipAddr)
        .split(",")[0]
        .trim();

    const createDate =
      moment().format(
        "YYYYMMDDHHmmss"
      );

    let vnpParams = {

      vnp_Version:
        "2.1.0",

      vnp_Command:
        "pay",

      vnp_TmnCode:
        process.env.VNP_TMNCODE,

      vnp_Locale:
        "vn",

      vnp_CurrCode:
        "VND",

      vnp_TxnRef:
        String(orderId),

      vnp_OrderInfo:
        `Thanh toan don ${orderId}`,

      vnp_OrderType:
        "other",

      vnp_Amount:
        Math.round(
          Number(amount) * 100
        ),

      vnp_ReturnUrl:
        process.env.VNP_RETURN_URL,

      vnp_IpAddr:
        ipAddr,

      vnp_CreateDate:
        createDate,

    };

    vnpParams =
  sortObject(
    vnpParams
  );

const signData =
  qs.stringify(
    vnpParams,
    {
      encode: false,
    }
  );

    const secureHash =
      crypto
        .createHmac(
          "sha512",
          process.env
            .VNP_HASHSECRET
            .trim()
        )
        .update(
          signData,
          "utf8"
        )
        .digest("hex");

    vnpParams.vnp_SecureHash =
  secureHash;

const paymentUrl =
  process.env.VNP_URL +
  "?" +
  qs.stringify(
    vnpParams,
    {
      encode: false,
    }
  );

    console.log(
      "========== SIGN DATA =========="
    );
    console.log(
      signData
    );

    console.log(
      "========== PAYMENT URL =========="
    );
    console.log(
      paymentUrl
    );

    return res.json({
      paymentUrl,
    });

  }
);

router.get(
  "/vnpay-return",
  async (req, res) => {

    const vnpParams =
      Object.assign(
        {},
        req.query
      );

      console.log(process.env.VNP_TMNCODE);

console.log(process.env.VNP_HASHSECRET);

console.log(process.env.VNP_URL);

console.log(process.env.VNP_RETURN_URL);
    const secureHash =
      vnpParams.vnp_SecureHash;

    delete vnpParams.vnp_SecureHash;

    delete vnpParams.vnp_SecureHashType;

    const signData =
      qs.stringify(
        sortObject(vnpParams),
        {
          encode: false,
        }
      );

    const signed =
  crypto
    .createHmac(
      "sha512",
      process.env
        .VNP_HASHSECRET
        .trim()
    )
    .update(
      signData,
      "utf8"
    )
    .digest("hex");

    if (
      secureHash !== signed
    ) {

      return res
        .status(400)
        .send("Sai chữ ký VNPay");

    }

    if (
      req.query.vnp_ResponseCode !== "00"
    ) {

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-failed`
      );

    }

    const orderId =
      Number(req.query.vnp_TxnRef);

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {

      return res
        .status(400)
        .send("Order not found");

    }

    try {

      await beginTransaction();

      const order =
        await loadOrder(orderId);

      if (
        order.status !== "PENDING"
      ) {

        await rollback();

        return res
          .status(400)
          .send("Order is not pending");

      }

      const paymentRows =
        await query(
          `
            SELECT id
            FROM payments
            WHERE order_id = ?
              AND status = 'SUCCESS'
          `,
          [order.id]
        );

      if (
        paymentRows.length
      ) {

        await rollback();

        return res
          .status(400)
          .send("Payment already processed");

      }

      const event =
        await loadEvent(order.event_id);

      const items =
        await loadOrderItems(order.id);

      if (
        !event
      ) {

        throw new Error("Event not found");

      }

      if (
        !items.length
      ) {

        throw new Error("Order does not contain any items");

      }

      const userRows =
        await query(
          `
            SELECT email
            FROM users
            WHERE id = ?
          `,
          [order.user_id]
        );

      if (
        !userRows.length
      ) {

        throw new Error("User not found");

      }

      const userEmail =
        userRows[0].email;

      const context = {
        order,
        event,
        items,
        itemIndex: 0,
      };

      await processNextItem(context);

      const ticketRows =
        await finishPayment(
          context,
          req.query.vnp_TransactionNo
        );

      await commit();

      try {

        await sendTicketMail(
          userEmail,
          order.id,
          ticketRows
        );

      } catch (error) {

        console.error(
          "Unable to send ticket email:",
          error
        );

      }

      return res.redirect(
        `${process.env.FRONTEND_URL}/payment-success?orderId=${order.id}`
      );

    } catch (error) {

      await rollback();

      console.error(
        "VNPay payment processing error:",
        error
      );

      return res
        .status(500)
        .send(
          error.message ||
          "Payment processing error"
        );

    }

  }
);

async function loadOrder(orderId) {

  const rows =
    await query(
      "SELECT * FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );

  if (
    !rows.length
  ) {

    throw new Error("Order not found");

  }

  return rows[0];

}

async function loadEvent(eventId) {

  const rows =
    await query(
      "SELECT * FROM events WHERE id = ?",
      [eventId]
    );

  return rows[0] || null;

}

function loadOrderItems(orderId) {

  return query(
    `
      SELECT
        oi.*,
        z.id AS zone_id,
        z.name AS zone_name,
        z.zone_type
      FROM order_items oi
      JOIN zones z ON z.id = oi.zone_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `,
    [orderId]
  );

}

async function processNextItem(context) {

  if (
    context.itemIndex >= context.items.length
  ) {

    return;

  }

  const item =
    context.items[context.itemIndex];

  context.itemIndex += 1;

  if (
    context.event.seat_mode === "MANUAL"
  ) {

    await processManual(
      context.order,
      item
    );

  } else {

    await processAuto(
      context.order,
      item
    );

  }

  await processNextItem(context);

}

async function processManual(order, item) {

  if (
    !item.seat_id
  ) {

    throw new Error("Manual order item does not have a seat");

  }

  const result =
    await query(
      `
        UPDATE showtime_seats
        SET status = 'SOLD'
        WHERE showtime_id = ? AND seat_id = ? AND status = 'HELD'
      `,
      [
        order.showtime_id,
        item.seat_id,
      ]
    );

  if (
    result.affectedRows !== 1
  ) {

    throw new Error("Ghế đã được đặt hoặc không tồn tại");

  }

  await createTicket(order, {
  orderItemId: item.id,
  zoneId: item.zone_id,
  seatId: item.seat_id,
});

}

async function processAuto(order, item) {

  if (
    item.zone_type === "SEATING"
  ) {

    await processAutoSeating(
      order,
      item
    );

    return;

  }

  if (
    item.zone_type === "STANDING"
  ) {

    await processStanding(
      order,
      item
    );

    return;

  }

  throw new Error("Invalid zone type");

}

async function processAutoSeating(order, item) {

  const quantity =
    Number(item.quantity);

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {

    throw new Error("Invalid ticket quantity");

  }

  const seats =
    await query(
      `
        SELECT ss.id, ss.seat_id
        FROM showtime_seats ss
        JOIN seats s ON s.id = ss.seat_id
        WHERE ss.showtime_id = ?
          AND ss.zone_id = ?
          AND ss.status = 'AVAILABLE'
        ORDER BY s.row_label ASC, s.seat_number ASC
        LIMIT ?
        FOR UPDATE
      `,
      [
        order.showtime_id,
        item.zone_id,
        quantity,
      ]
    );

  if (
    seats.length < quantity
  ) {

    throw new Error("Không đủ ghế");

  }

  for (
    const seat of seats
  ) {

    const result =
      await query(
        "UPDATE showtime_seats SET status = 'SOLD' WHERE id = ? AND status = 'AVAILABLE'",
        [seat.id]
      );

    if (
      result.affectedRows !== 1
    ) {

      throw new Error("Ghế đã được đặt hoặc không tồn tại");

    }

    await createTicket(order, {
  orderItemId: item.id,
  zoneId: item.zone_id,
  seatId: seat.seat_id,
});

  }

}

async function processStanding(order, item) {


  const quantity =
    Number(item.quantity);

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {

    throw new Error("Invalid ticket quantity");

  }


  console.log("ORDER SHOWTIME:", order.showtime_id);
console.log("ITEM ZONE:", item.zone_id);

const inventoryRows =
  await query(
    `
    SELECT id, capacity, sold_count
    FROM showtime_standing_inventory
    WHERE showtime_id = ? AND zone_id = ?
    FOR UPDATE
    `,
    [
      order.showtime_id,
      item.zone_id,
    ]
  );

console.log("inventoryRows =", inventoryRows);

  if (
    !inventoryRows.length
  ) {

    throw new Error("Không tìm thấy Standing");

  }

  const inventory =
    inventoryRows[0];

  const available =
    Number(inventory.capacity) -
    Number(inventory.sold_count);

  if (
    available < quantity
  ) {

    throw new Error("Không đủ vé Standing");

  }

  for (
    let index = 1;
    index <= quantity;
    index += 1
  ) {

    const standingNumber =
      `${item.zone_name}-${String(
        Number(inventory.sold_count) + index
      ).padStart(6, "0")}`;

    await createTicket(order, {
  orderItemId: item.id,
  zoneId: item.zone_id,
  standingNumber,
});

  }

  await query(
    `
      UPDATE showtime_standing_inventory
      SET sold_count = sold_count + ?
      WHERE id = ?
    `,
    [
      quantity,
      inventory.id,
    ]
  );
  

}

async function finishPayment(context, transactionCode) {

  const order =
    context.order;

  await query(
    "UPDATE orders SET status = 'PAID' WHERE id = ?",
    [order.id]
  );

  if (
    context.event.seat_mode === "MANUAL"
  ) {

    await query(
      `
        DELETE FROM ticket_holds
WHERE user_id = ?
AND showtime_id = ?
      `,
     [
  order.user_id,
  order.showtime_id,
]
    );

  }

  await query(
    `
      INSERT INTO payments (
        order_id,
        amount,
        payment_method,
        transaction_code,
        status
      )
      VALUES (?, ?, 'VNPAY', ?, 'SUCCESS')
    `,
    [
      order.id,
      order.total_price,
      transactionCode,
    ]
  );

  if (
    order.promotion_id
  ) {

    await query(
      `
        UPDATE promotions
        SET
          used_count = used_count + 1,
          status = CASE
            WHEN used_count + 1 >= quantity THEN 'INACTIVE'
            ELSE status
          END
        WHERE id = ?
      `,
      [order.promotion_id]
    );

  }

  return query(
    `
      SELECT ticket_code, standing_number, seat_id
FROM tickets
WHERE user_id = ?
AND showtime_id = ?
ORDER BY id ASC
    `,
   [
  order.user_id,
  order.showtime_id,
]
  );

}

module.exports = router;
