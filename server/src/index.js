import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import * as alpaca from "./alpaca.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const TOKEN = process.env.SERVER_TOKEN || "changeme";
const PAPER = process.env.ALPACA_PAPER !== "false";

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  if (h === `Bearer ${TOKEN}`) return next();
  return res.status(401).json({ error: "unauthorized" });
}
app.use(auth);

// Wrap an async fn so errors become a clean JSON 502 (Alpaca/network failure).
const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res))
    .then((d) => res.json(d))
    .catch((e) => res.status(502).json({ error: String(e.message || e) }));
};

app.get("/api/mode", (req, res) => res.json({ paper: PAPER }));
app.get("/api/account", wrap(() => alpaca.getAccount()));
app.get("/api/positions", wrap(() => alpaca.getPositions()));
app.get("/api/orders", wrap(() => alpaca.getOrders("all")));
app.post("/api/orders", wrap((req) => alpaca.placeOrder(req.body || {})));
app.delete("/api/orders/:id", wrap((req) => alpaca.cancelOrder(req.params.id)));
app.get("/api/quote/:symbol", wrap((req) => alpaca.getQuote(req.params.symbol)));
app.get("/api/bars/:symbol", wrap((req) => alpaca.getBars(req.params.symbol, 50)));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`NSE Market Hub trading backend on :${PORT} (paper=${PAPER})`);
});
