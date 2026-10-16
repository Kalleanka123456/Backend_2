export function createTransactionController(assetModel) {
  return {
    create(req, res) {
      const transaction = assetModel.submitTransaction(req.body);
      res.status(201).json({ transaction });
    },
  };
}
