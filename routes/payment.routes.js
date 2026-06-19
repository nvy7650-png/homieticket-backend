const express = require("express");
const router = express.Router();

const crypto = require("crypto");
const qs = require("qs");
const moment = require("moment");

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;

  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(
        encodeURIComponent(key)
      );
    }
  }

  str.sort();

  for (key = 0; key < str.length; key++) {
    sorted[
      str[key]
    ] = encodeURIComponent(
      obj[
        str[key]
      ]
    ).replace(
      /%20/g,
      "+"
    );
  }

  return sorted;
}

router.post(
  "/create",
  async (req, res) => {

    try {

      const {
        orderId,
        amount,
      } = req.body;

      const tmnCode =
        process.env.VNP_TMNCODE;

      const secretKey =
        process.env.VNP_HASHSECRET;

      const vnpUrl =
        process.env.VNP_URL;

      const returnUrl =
`${process.env.API_URL}/api/payment/vnpay-return`;

      const ipAddr =
        (
          req.headers[
            "x-forwarded-for"
          ] ||
          req.socket
            .remoteAddress ||
          "127.0.0.1"
        )
          .split(",")[0]
          .trim();

      const createDate =
  moment().format(
    "YYYYMMDDHHmmss"
  );

      let vnp_Params = {};

      vnp_Params[
        "vnp_Version"
      ] = "2.1.0";

      vnp_Params[
        "vnp_Command"
      ] = "pay";

      vnp_Params[
        "vnp_TmnCode"
      ] = tmnCode;

      vnp_Params[
        "vnp_Locale"
      ] = "vn";

      vnp_Params[
        "vnp_CurrCode"
      ] = "VND";

      vnp_Params[
        "vnp_TxnRef"
      ] =
        String(orderId);

      vnp_Params[
        "vnp_OrderInfo"
      ] =
        `Thanh toan don hang ${orderId}`;

      vnp_Params[
        "vnp_OrderType"
      ] = "other";

      vnp_Params[
        "vnp_Amount"
      ] =
        Number(amount) *
        100;

      vnp_Params[
        "vnp_ReturnUrl"
      ] = returnUrl;

      vnp_Params[
        "vnp_IpAddr"
      ] = ipAddr;

      vnp_Params[
        "vnp_CreateDate"
      ] = createDate;

      vnp_Params =
        sortObject(
          vnp_Params
        );

      const signData =
        qs.stringify(
          vnp_Params,
          {
            encode: false,
          }
        );

      const secureHash =
        crypto
          .createHmac(
            "sha512",
            secretKey
          )
          .update(
            Buffer.from(
              signData,
              "utf-8"
            )
          )
          .digest(
            "hex"
          );

      vnp_Params[
        "vnp_SecureHash"
      ] =
        secureHash;

      const paymentUrl =
        vnpUrl +
        "?" +
        qs.stringify(
          vnp_Params,
          {
            encode: false,
          }
        );

      console.log(
        "===================="
      );

      console.log(
        "SIGN DATA:"
      );

      console.log(
        signData
      );

      console.log(
        "SECURE HASH:"
      );

      console.log(
        secureHash
      );

      console.log(
        "PAYMENT URL:"
      );

      console.log(
        paymentUrl
      );

      return res.json({
        paymentUrl,
      });

    } catch (err) {

      console.log(err);

      return res
        .status(500)
        .json({
          message:
            "Server error",
        });

    }

  }
);

const db = require("../db");

router.get(
  "/vnpay-return",
  (req, res) => {

    try {

      const orderId =
        req.query.vnp_TxnRef;

      const responseCode =
        req.query.vnp_ResponseCode;

      console.log(
        "========== VNPAY RETURN =========="
      );

      console.log(
        "ORDER:",
        orderId
      );

      console.log(
        "RESPONSE:",
        responseCode
      );

      if (
        responseCode !== "00"
      ) {

        return res.redirect(
          `https://homieticket.vercel.app/payment-success?vnp_ResponseCode=${responseCode}`
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
        (err) => {

          if (err) {

            console.log(err);

            return res.status(500).send(
              "DB Error"
            );

          }

          const updateHoldSql = `
            UPDATE ticket_holds
            SET status = 'CONFIRMED'
            WHERE user_id = (
              SELECT user_id
              FROM orders
              WHERE id = ?
            )
            AND status = 'ACTIVE'
          `;

          db.query(
            updateHoldSql,
            [orderId],
            (err2) => {

              if (err2) {

                console.log(
                  err2
                );

              }

              return res.redirect(
                `https://homieticket.vercel.app/payment-success?vnp_ResponseCode=00&vnp_TxnRef=${orderId}`
              );

            }
          );

        }
      );

    } catch (err) {

      console.log(err);

      return res
        .status(500)
        .send(
          "Server Error"
        );

    }

  }
);

module.exports =
  router;