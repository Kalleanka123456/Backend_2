export class AssetError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AssetError";
    this.statusCode = statusCode;
  }
}

export default class AssetModel {
  constructor(blockchain) {
    this.blockchain = blockchain;
  }

  submitTransaction(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new AssetError("Begäran måste innehålla en transaktion.", 400);
    }

    const { type, serialNumber, fromAddress, toAddress, timestamp } = payload;

    if (type !== "REGISTER" && type !== "TRANSFER") {
      throw new AssetError("Transaktionstypen måste vara REGISTER eller TRANSFER.", 400);
    }
    if (typeof serialNumber !== "string" || !serialNumber.trim()) {
      throw new AssetError("Serienummer måste anges.", 400);
    }
    if (typeof fromAddress !== "string" || !fromAddress.trim()) {
      throw new AssetError("Avsändaradress måste anges.", 400);
    }
    if (typeof toAddress !== "string" || !toAddress.trim()) {
      throw new AssetError("Mottagare får inte vara tom.", 400);
    }
    if (
      timestamp !== undefined &&
      (!Number.isSafeInteger(timestamp) || timestamp <= 0)
    ) {
      throw new AssetError("Tidsstämpeln måste vara ett positivt heltal.", 400);
    }

    const normalizedSerialNumber = serialNumber.trim();
    const normalizedFromAddress = fromAddress.trim();
    const normalizedToAddress = toAddress.trim();
    const history = this.getConfirmedHistory(normalizedSerialNumber);

    if (type === "REGISTER") {
      const isAlreadyRegistered =
        history.some((transaction) => transaction.type === "REGISTER") ||
        this.blockchain.pendingTransactions.some(
          (transaction) =>
            transaction.type === "REGISTER" &&
            transaction.serialNumber === normalizedSerialNumber,
        );

      if (isAlreadyRegistered) {
        throw new AssetError("Produkten är redan registrerad.", 409);
      }
    } else {
      const currentOwner = this.getCurrentOwner(normalizedSerialNumber, true);

      if (currentOwner === null) {
        throw new AssetError("Produkten är inte registrerad.", 404);
      }
      if (normalizedFromAddress !== currentOwner) {
        throw new AssetError(
          "Endast den nuvarande ägaren får överföra produkten.",
          409,
        );
      }
    }

    const transaction = {
      type,
      serialNumber: normalizedSerialNumber,
      fromAddress: normalizedFromAddress,
      toAddress: normalizedToAddress,
      timestamp: timestamp ?? Date.now(),
    };

    this.blockchain.addTransaction(transaction);
    return transaction;
  }

  getProduct(serialNumber) {
    const history = this.getConfirmedHistory(serialNumber);
    if (!history.some((transaction) => transaction.type === "REGISTER")) {
      return null;
    }

    return {
      serialNumber,
      history,
      currentOwner: this.getCurrentOwner(serialNumber, false),
    };
  }

  getConfirmedHistory(serialNumber) {
    return this.blockchain.chain
      .slice(1)
      .flatMap((block) => block.data)
      .filter((transaction) => transaction.serialNumber === serialNumber);
  }

  getCurrentOwner(serialNumber, includePending = false) {
    const history = this.getConfirmedHistory(serialNumber);
    if (includePending) {
      history.push(
        ...this.blockchain.pendingTransactions.filter(
          (transaction) => transaction.serialNumber === serialNumber,
        ),
      );
    }

    let currentOwner = null;
    for (const transaction of history) {
      if (transaction.type === "REGISTER" && currentOwner === null) {
        currentOwner = transaction.toAddress;
      } else if (
        transaction.type === "TRANSFER" &&
        transaction.fromAddress === currentOwner
      ) {
        currentOwner = transaction.toAddress;
      }
    }

    return currentOwner;
  }
}
