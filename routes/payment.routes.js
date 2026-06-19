const express = require("express");
const router = express.Router();

const crypto = require("crypto");
const qs = require("qs");
const moment = require("moment");

router.post(
"/create",
async (req, res) => {

try {

  const { orderId, amount } =
    req.body;

  if (
    !orderId ||
    !amount
  ) {

    return res.status(400).json({
      message:
        "Thiếu dữ liệu",
    });

  }

  const tmnCode =
    process.env.VNP_TMNCODE;

  const secretKey =
    process.env.VNP_HASHSECRET;

  const vnpUrl =
    process.env.VNP_URL;

  const returnUrl =
    "https://homieticket.vercel.app/payment-success";

  const createDate =
    moment().format(
      "YYYYMMDDHHmmss"
    );

  const ipAddr =
    req.headers[
      "x-forwarded-for"
    ] ||
    req.socket.remoteAddress ||
    "127.0.0.1";

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
  ] = orderId;

  vnp_Params[
    "vnp_OrderInfo"
  ] =
    `Thanh toan don hang ${orderId}`;

  vnp_Params[
    "vnp_OrderType"
  ] = "other";

  vnp_Params[
    "vnp_Amount"
  ] = amount * 100;

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
    Object.fromEntries(
      Object.entries(
        vnp_Params
      ).sort()
    );

  const signData =
    qs.stringify(
      vnp_Params,
      {
        encode: false,
      }
    );

  const signed =
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
      .digest("hex");

  vnp_Params[
    "vnp_SecureHash"
  ] = signed;

  const paymentUrl =
    vnpUrl +
    "?" +
    qs.stringify(
      vnp_Params,
      {
        encode: false,
      }
    );

  return res.json({
    paymentUrl,
  });

} catch (err) {

  console.log(err);

  return res.status(500).json({
    message:
      "Server error",
  });

}


}
);

module.exports = router;
