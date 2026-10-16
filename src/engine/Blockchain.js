import Block from "./Block.js";

const DEFAULT_DIFFICULTY = 3;
const MAX_DIFFICULTY = 6;

function readDifficulty() {
  const configuredDifficulty = Number(process.env.POW_DIFFICULTY);

  if (
    !Number.isInteger(configuredDifficulty) ||
    configuredDifficulty < 1 ||
    configuredDifficulty > MAX_DIFFICULTY
  ) {
    return DEFAULT_DIFFICULTY;
  }

  return configuredDifficulty;
}

export default class Blockchain {
  constructor() {
    this.difficulty = readDifficulty();
    this.chain = [new Block(0, Date.now(), [], "0")];
    this.pendingTransactions = [];
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addTransaction(transaction) {
    this.pendingTransactions.push({ ...transaction });
  }

  minePendingTransactions() {
    if (this.pendingTransactions.length === 0) {
      return null;
    }

    const previousBlock = this.getLatestBlock();
    const block = new Block(
      previousBlock.index + 1,
      Date.now(),
      this.pendingTransactions,
      previousBlock.hash,
    );
    block.mineBlock(this.difficulty);
    this.chain.push(block);
    this.pendingTransactions = [];

    return block;
  }

  isChainValid() {
    const genesisBlock = this.chain[0];
    if (
      !genesisBlock ||
      genesisBlock.index !== 0 ||
      genesisBlock.previousHash !== "0" ||
      genesisBlock.hash !== genesisBlock.calculateHash()
    ) {
      return false;
    }

    for (let index = 1; index < this.chain.length; index += 1) {
      const currentBlock = this.chain[index];
      const previousBlock = this.chain[index - 1];

      if (
        currentBlock.index !== previousBlock.index + 1 ||
        currentBlock.hash !== currentBlock.calculateHash() ||
        currentBlock.previousHash !== previousBlock.hash ||
        !currentBlock.hash.startsWith("0".repeat(this.difficulty))
      ) {
        return false;
      }
    }

    return true;
  }
}
