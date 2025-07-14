import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reviewsFile = "./data/reviews.json";
let reviews = JSON.parse(fs.readFileSync(reviewsFile));

const app = express();
const products = JSON.parse(fs.readFileSync("./data/products.json"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: true,
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.get("/", (req, res) => {
  res.render("index", { products });
});

app.post("/add-to-cart", (req, res) => {
  const productId = parseInt(req.body.productId);
  const size = req.body.size;
  const product = products.find((p) => p.id === productId);

  if (!req.session.cart) req.session.cart = [];

  const existing = req.session.cart.find(
    (item) => item.id === productId && item.size === size
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    req.session.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      size,
      images: product.images,
      quantity: 1,
    });
  }

  res.redirect(`/item/${productId}?added=true`);
});

app.post("/remove-from-cart", (req, res) => {
  const productId = parseInt(req.body.productId);
  const size = req.body.size;

  if (req.session.cart) {
    req.session.cart = req.session.cart.filter(
      (item) => !(item.id === productId && item.size === size)
    );
  }

  res.redirect("/checkout");
});

app.get("/checkout", (req, res) => {
  const cart = req.session.cart || [];
  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  res.render("checkout", { cart, subtotal });
});

app.post("/submit-order", (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const order = {
    cart,
    total,
    email: req.body.email,
    name: req.body.name,
    address: req.body.address,
    country: req.body.country,
    city: req.body.city,
    postalCode: req.body.postalCode,
    phone: req.body.phone,
  };

  req.session.lastOrder = order;
  req.session.cart = []; // Clear cart

  res.render("confirmation", { order });
});

app.get("/invoice", (req, res) => {
  const order = req.session.lastOrder;
  if (!order) {
    return res.send("No order found. Please place an order first.");
  }
  res.render("invoice", { order });
});

app.get("/track", (req, res) => {
  res.render("track");
});

app.get("/item/:id", (req, res) => {
  const product = products.find((p) => p.id == req.params.id);
  const addedToCart = req.query.added === "true";
  const productReviews = reviews[req.params.id] || [];
  res.render("item", { product, addedToCart, productReviews });
});

app.post("/item/:id/review", (req, res) => {
  const productId = req.params.id;
  const name = req.body.name;
  const content = req.body.content;

  if (!reviews[productId]) {
    reviews[productId] = [];
  }

  reviews[productId].push({ name, content });
  fs.writeFileSync(reviewsFile, JSON.stringify(reviews, null, 2));

  res.redirect(`/item/${productId}`);
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
