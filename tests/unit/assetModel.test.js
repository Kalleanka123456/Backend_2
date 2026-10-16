import { afterEach, describe, expect, it } from "vitest";
import Blockchain from "../../src/engine/Blockchain.js";
import AssetModel from "../../src/models/assetModel.js";

const tidigareSvårighet = process.env.POW_DIFFICULTY;

function skapaModell() {
  process.env.POW_DIFFICULTY = "1";
  return new AssetModel(new Blockchain());
}

function registrering(serialNumber = "ROLEX-SUB-9981") {
  return {
    type: "REGISTER",
    serialNumber,
    fromAddress: "Manufacturer",
    toAddress: "CollectorA",
  };
}

function överföring(fromAddress, toAddress, serialNumber = "ROLEX-SUB-9981") {
  return { type: "TRANSFER", serialNumber, fromAddress, toAddress };
}

afterEach(() => {
  if (tidigareSvårighet === undefined) {
    delete process.env.POW_DIFFICULTY;
  } else {
    process.env.POW_DIFFICULTY = tidigareSvårighet;
  }
});

describe("AssetModel", () => {
  it("registrerar en produkt som väntande transaktion", () => {
    const model = skapaModell();
    const transaction = model.submitTransaction(registrering());

    expect(transaction.type).toBe("REGISTER");
    expect(model.blockchain.pendingTransactions).toEqual([transaction]);
  });

  it("avvisar överföring av en oregistrerad produkt", () => {
    const model = skapaModell();

    expect(() => model.submitTransaction(överföring("CollectorA", "CollectorB")))
      .toThrow(/inte registrerad/i);
  });

  it("avvisar dubbla serienummer även när registreringen väntar på mining", () => {
    const model = skapaModell();
    model.submitTransaction(registrering());

    expect(() => model.submitTransaction(registrering()))
      .toThrow(/redan registrerad/i);
  });

  it("avvisar överföring från någon annan än den aktuella ägaren", () => {
    const model = skapaModell();
    model.submitTransaction(registrering());
    model.blockchain.minePendingTransactions();

    expect(() => model.submitTransaction(överföring("Ken", "CollectorB")))
      .toThrow(/nuvarande ägaren/i);
  });

  it("validerar flera väntande överföringar mot ägaren efter föregående väntande transaktion", () => {
    const model = skapaModell();
    model.submitTransaction(registrering());
    model.submitTransaction(överföring("CollectorA", "CollectorB"));

    expect(() => model.submitTransaction(överföring("CollectorA", "CollectorC")))
      .toThrow(/nuvarande ägaren/i);
    expect(() => model.submitTransaction(överföring("CollectorB", "CollectorC")))
      .not.toThrow();
  });

  it("returnerar bekräftad historik och aktuell ägare", () => {
    const model = skapaModell();
    model.submitTransaction(registrering());
    model.blockchain.minePendingTransactions();
    model.submitTransaction(överföring("CollectorA", "CollectorB"));
    model.blockchain.minePendingTransactions();

    expect(model.getProduct("ROLEX-SUB-9981")).toEqual({
      serialNumber: "ROLEX-SUB-9981",
      history: [
        expect.objectContaining({ type: "REGISTER", toAddress: "CollectorA" }),
        expect.objectContaining({
          type: "TRANSFER",
          fromAddress: "CollectorA",
          toAddress: "CollectorB",
        }),
      ],
      currentOwner: "CollectorB",
    });
  });

  it("avvisar payloads med tomma adresser", () => {
    const model = skapaModell();

    expect(() =>
      model.submitTransaction({
        ...registrering(),
        toAddress: " ",
      }),
    ).toThrow(/mottagare/i);
    expect(model.blockchain.pendingTransactions).toEqual([]);
  });
});
