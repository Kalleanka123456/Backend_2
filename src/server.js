import createApp from "./app.js";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT måste vara ett heltal mellan 1 och 65535.");
}

createApp().listen(port, () => {
  console.log(`API-servern lyssnar på port ${port}.`);
});
