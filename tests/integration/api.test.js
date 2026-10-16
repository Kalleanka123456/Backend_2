import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import createApp from "../../src/app.js";

const tidigareSvårighet = process.env.POW_DIFFICULTY;

function skapaApp() {
  process.env.POW_DIFFICULTY = "1";
  return createApp();
}

const registrering = {
  type: "REGISTER",
  serialNumber: "ROLEX-SUB-9981",
  fromAddress: "Manufacturer",
  toAddress: "CollectorA",
};

afterEach(() => {
  if (tidigareSvårighet === undefined) {
    delete process.env.POW_DIFFICULTY;
  } else {
    process.env.POW_DIFFICULTY = tidigareSvårighet;
  }
});

describe("REST API", () => {
  it("returnerar kedjan och väntande transaktioner", async () => {
    const app = skapaApp();

    const response = await request(app).get("/api/chain");

    expect(response.status).toBe(200);
    expect(response.body.chain).toHaveLength(1);
    expect(response.body.pendingTransactions).toEqual([]);
    expect(response.body.isValid).toBe(true);
  });

  it("accepterar en registrering och avvisar felaktiga eller dubblerade requests", async () => {
    const app = skapaApp();

    const accepted = await request(app).post("/api/transactions").send(registrering);
    const duplicate = await request(app).post("/api/transactions").send(registrering);
    const invalid = await request(app)
      .post("/api/transactions")
      .send({ ...registrering, toAddress: " " });

    expect(accepted.status).toBe(201);
    expect(accepted.body.transaction.type).toBe("REGISTER");
    expect(duplicate.status).toBe(409);
    expect(invalid.status).toBe(400);
    expect(app.locals.blockchain.pendingTransactions).toHaveLength(1);
  });

  it("returnerar 404 för okänd produkt och 409 vid fel ägare", async () => {
    const app = skapaApp();

    const missing = await request(app)
      .post("/api/transactions")
      .send({
        type: "TRANSFER",
        serialNumber: "MISSING",
        fromAddress: "CollectorA",
        toAddress: "CollectorB",
      });
    await request(app).post("/api/transactions").send(registrering);
    await request(app).post("/api/mine");
    const wrongOwner = await request(app)
      .post("/api/transactions")
      .send({
        type: "TRANSFER",
        serialNumber: registrering.serialNumber,
        fromAddress: "Ken",
        toAddress: "CollectorB",
      });

    expect(missing.status).toBe(404);
    expect(wrongOwner.status).toBe(409);
  });

  it("minar väntande transaktioner och svarar tydligt när kön är tom", async () => {
    const app = skapaApp();
    const empty = await request(app).post("/api/mine");
    await request(app).post("/api/transactions").send(registrering);
    const mined = await request(app).post("/api/mine");

    expect(empty.status).toBe(409);
    expect(empty.body.error).toMatch(/väntande/i);
    expect(mined.status).toBe(201);
    expect(mined.body.block.data).toHaveLength(1);
  });

  it("verifierar produktens historia och rapporterar okända serienummer", async () => {
    const app = skapaApp();
    await request(app).post("/api/transactions").send(registrering);
    await request(app).post("/api/mine");
    await request(app).post("/api/transactions").send({
      type: "TRANSFER",
      serialNumber: registrering.serialNumber,
      fromAddress: "CollectorA",
      toAddress: "CollectorB",
    });
    await request(app).post("/api/mine");

    const verified = await request(app).get(
      `/api/verify/${registrering.serialNumber}`,
    );
    const missing = await request(app).get("/api/verify/UNKNOWN");

    expect(verified.status).toBe(200);
    expect(verified.body.exists).toBe(true);
    expect(verified.body.currentOwner).toBe("CollectorB");
    expect(verified.body.history).toHaveLength(2);
    expect(verified.body.chainValid).toBe(true);
    expect(missing.status).toBe(404);
  });

  it("returnerar 400 för felaktig JSON", async () => {
    const app = skapaApp();

    const response = await request(app)
      .post("/api/transactions")
      .set("Content-Type", "application/json")
      .send('{"type":');

    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
  });
});
