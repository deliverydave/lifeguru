import express from "express";

const app = express();
const port = Number(process.env.PORT || 3001);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "couples-coach-api" });
});

if (process.argv[1] && process.argv[1].endsWith("index.mjs")) {
  app.listen(port, () => {
    console.log("api listening on " + port);
  });
}

export default app;
