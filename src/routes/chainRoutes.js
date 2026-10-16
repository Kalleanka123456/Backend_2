import { Router } from "express";
import { createChainController } from "../controllers/chainController.js";

export default function createChainRoutes(blockchain, assetModel) {
  const router = Router();
  const controller = createChainController(blockchain, assetModel);

  router.get("/chain", controller.getChain);
  router.post("/mine", controller.mine);
  router.get("/verify/:id", controller.verify);
  return router;
}
