const express = require("express");

const cors = require("cors");

const path = require("path");

// DB
const db = require("./db");

// ROUTES
const eventRoutes =
  require("./routes/event.routes");

const authRoutes =
  require("./routes/auth.routes");

const categoryRoutes =
  require("./routes/category.routes");

const adminRoutes =
  require("./routes/admin.routes");
const ticketRoutes =
  require("./routes/ticket.routes");

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

// EVENTS
app.use(
  "/api/events",
  eventRoutes
);

// AUTH
app.use(
  "/api/auth",
  authRoutes
);

// CATEGORIES
app.use(
  "/api/categories",
  categoryRoutes
);

// ADMIN
app.use(
  "/api/admin",
  adminRoutes
);

// TICKETS
app.use(
  "/api/tickets",
  ticketRoutes
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