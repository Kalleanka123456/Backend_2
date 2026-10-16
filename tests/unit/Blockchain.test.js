import { afterEach, describe, expect, it } from "vitest";
import Blockchain from "../../src/engine/Blockchain.js";

const tidigareSvårighet = process.env.POW_DIFFICULTY;

afterEach(() => {
  if (tidigareSvårighet === undefined) {
    delete process.env.POW_DIFFICULTY;
  } else {
    process.env.POW_DIFFICULTY = tidigareSvårighet;
  }
});

describe("Blockchain", () => {
  it("skapar ett genesis-block med rätt startvärden", () => {
    process.env.POW_DIFFICULTY = "1";
    const blockchain = new Blockchain();

    expect(blockchain.chain).toHaveLength(1);
    expect(blockchain.chain[0].index).toBe(0);
    expect(blockchain.chain[0].previousHash).toBe("0");
  });

  it("länkar ett block till föregående block och tömmer väntande transaktioner", () => {
    process.env.POW_DIFFICULTY = "1";
    const blockchain = new Blockchain();
    const transaction = { type: "REGISTER", serialNumber: "ROLEX-1" };
    blockchain.addTransaction(transaction);

    const minedBlock = blockchain.minePendingTransactions();

    expect(minedBlock.data).toEqual([transaction]);
    expect(minedBlock.previousHash).toBe(blockchain.chain[0].hash);
    expect(blockchain.chain).toHaveLength(2);
    expect(blockchain.pendingTransactions).toEqual([]);
  });

  it("godkänner en oförändrad och korrekt minerad kedja", () => {
    process.env.POW_DIFFICULTY = "1";
    const blockchain = new Blockchain();
    blockchain.addTransaction({ type: "REGISTER", serialNumber: "ROLEX-1" });
    blockchain.minePendingTransactions();

    expect(blockchain.isChainValid()).toBe(true);
  });

  it("upptäcker manipulerade data i historiken", () => {
    process.env.POW_DIFFICULTY = "1";
    const blockchain = new Blockchain();
    blockchain.addTransaction({ type: "REGISTER", serialNumber: "ROLEX-1" });
    blockchain.minePendingTransactions();
    blockchain.chain[1].data[0].serialNumber = "ROLEX-2";

    expect(blockchain.isChainValid()).toBe(false);
  });

  it("använder en säker standard när Proof-of-Work-konfigurationen är ogiltig", () => {
    process.env.POW_DIFFICULTY = "-4";

    expect(new Blockchain().difficulty).toBeGreaterThan(0);
  });
});
