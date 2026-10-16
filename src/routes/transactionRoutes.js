import { Router } from "express";
import { createTransactionController } from "../controllers/transactionController.js";

export default function createTransactionRoutes(assetModel) {
  const router = Router();
  const controller = createTransactionController(assetModel);

  router.post("/", controller.create);
  return router;
}
