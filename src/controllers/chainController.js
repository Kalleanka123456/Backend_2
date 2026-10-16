export function createChainController(blockchain, assetModel) {
  return {
    getChain(_req, res) {
      res.json({
        chain: blockchain.chain,
        pendingTransactions: blockchain.pendingTransactions,
        difficulty: blockchain.difficulty,
        isValid: blockchain.isChainValid(),
      });
    },

    mine(_req, res) {
      const block = blockchain.minePendingTransactions();
      if (!block) {
        return res.status(409).json({
          error: "Det finns inga väntande transaktioner att mina.",
        });
      }

      return res.status(201).json({ block });
    },

    verify(req, res) {
      const product = assetModel.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Produkten hittades inte." });
      }

      return res.json({
        exists: true,
        ...product,
        chainValid: blockchain.isChainValid(),
      });
    },
  };
}
