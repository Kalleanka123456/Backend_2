import express from "express";
import Blockchain from "./engine/Blockchain.js";
import AssetModel from "./models/assetModel.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import createChainRoutes from "./routes/chainRoutes.js";
import createTransactionRoutes from "./routes/transactionRoutes.js";

export default function createApp({
  blockchain = new Blockchain(),
  assetModel = new AssetModel(blockchain),
} = {}) {
  const app = express();
  app.use(express.json());
  app.locals.blockchain = blockchain;
  app.locals.assetModel = assetModel;
  app.use("/api/transactions", createTransactionRoutes(assetModel));
  app.use("/api", createChainRoutes(blockchain, assetModel));
  app.use(errorMiddleware);

  return app;
}
