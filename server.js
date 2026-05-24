const express = require("express");

const cors = require("cors");

const path = require("path");

const db = require("./db");

const eventRoutes =
  require("./routes/event.routes");

const authRoutes =
  require("./routes/auth.routes");

const app = express();


// ============================
// MIDDLEWARE
// ============================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
  extended: true,
}));


// ============================
// STATIC FILES
// ============================

// ACCESS IMAGE
app.use(

  "/uploads",

  express.static(
    path.join(__dirname, "uploads")
  )

);


// ============================
// ROUTES
// ============================

app.use(
  "/api/events",
  eventRoutes
);

app.use(
  "/api/auth",
  authRoutes
);


// ============================
// TEST API
// ============================

app.get("/", (req, res) => {

  res.send(
    "EVENTRA Backend OK 🚀"
  );

});


// ============================
// SERVER
// ============================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});