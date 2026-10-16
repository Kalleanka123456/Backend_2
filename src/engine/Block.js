import { createHash } from "node:crypto";

export default class Block {
  constructor(index, timestamp, data, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const contents = JSON.stringify({
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
      nonce: this.nonce,
    });

    return createHash("sha256").update(contents).digest("hex");
  }

  mineBlock(difficulty) {
    if (!Number.isInteger(difficulty) || difficulty < 0) {
      throw new RangeError("Svårighetsgraden måste vara ett icke-negativt heltal.");
    }

    const target = "0".repeat(difficulty);
    do {
      this.nonce += 1;
      this.hash = this.calculateHash();
    } while (!this.hash.startsWith(target));
  }
}
