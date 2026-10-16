import { describe, expect, it } from "vitest";
import Block from "../../src/engine/Block.js";

const skapaBlock = () =>
  new Block(
    1,
    1772188800000,
    [{ serialNumber: "ROLEX-SUB-9981", toAddress: "CollectorA" }],
    "föregående-hash",
  );

describe("Block", () => {
  it("beräknar samma hash för ett oförändrat block", () => {
    const block = skapaBlock();

    expect(block.calculateHash()).toBe(block.calculateHash());
  });

  it("tar hänsyn till data, nonce och föregående hash vid hashberäkning", () => {
    const block = skapaBlock();
    const ursprungligHash = block.calculateHash();

    block.data[0].toAddress = "CollectorB";
    expect(block.calculateHash()).not.toBe(ursprungligHash);

    block.data[0].toAddress = "CollectorA";
    block.nonce += 1;
    expect(block.calculateHash()).not.toBe(ursprungligHash);

    block.nonce -= 1;
    block.previousHash = "annan-hash";
    expect(block.calculateHash()).not.toBe(ursprungligHash);
  });

  it("minar tills hashen uppfyller svårighetsgraden", () => {
    const block = skapaBlock();

    block.mineBlock(2);

    expect(block.hash).toMatch(/^00/);
    expect(block.hash).toBe(block.calculateHash());
  });
});
