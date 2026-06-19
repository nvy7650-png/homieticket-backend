const express = require("express");
const router = express.Router();

const crypto = require("crypto");
const qs = require("qs");
const moment = require("moment");

function sortObject(obj) {

  let sorted = {};
  let keys = Object.keys(obj).sort();

  keys.forEach((key) => {
    sorted[key] = obj[key];
  });

  return sorted;
}

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
  (
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "127.0.0.1"
  )
    .split(",")[0]
    .trim();

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
  sortObject(vnp_Params);

const signData =
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
  "TMNCODE:",
  tmnCode
);

console.log(
  "SECRET:",
  secretKey
);

console.log(
  "SIGN DATA:"
);

console.log(signData);

console.log(
  "===================="
);

console.log("IP:", ipAddr);

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

console.log(
  "SIGNATURE:"
);

console.log(signed);

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
