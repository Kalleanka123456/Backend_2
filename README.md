# Blockchain-API för lyxprodukter

Ett undervisningsexempel på ett REST API i Node.js som registrerar lyxprodukter och deras ägarhistorik i en in-memory-blockchain. Proof-of-Work använder SHA-256 från Node.js inbyggda `crypto`-modul. Produkten representeras av ett serienummer och historiken av registrerings- och överföringstransaktioner.

> Detta projekt är inte en fullständig produktautentisering. Adresserna är vanliga textvärden, inte kryptografiska identiteter eller digitala signaturer. Blockkedjan lagras endast i processminnet och återställs när servern startas om.

## Förutsättningar och installation

Projektet kräver Node.js 22 eller senare.

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Servern startar som standard på `http://localhost:3000`. Ändra värdena i `.env` för att konfigurera port eller mining-svårighet. Utvecklingsläge med automatisk omstart:

```powershell
npm run dev
```

## Proof-of-Work

`POW_DIFFICULTY` anger antalet inledande nollor som en minerad blockhash måste ha. Standardvärdet är `3`; giltiga konfigurerade värden är heltal mellan `1` och `6`. Saknat eller ogiltigt värde ger standardvärdet. Högre värden kräver mer beräkning. Testerna sätter värdet till `1` för snabb mining.

## Datamodell och ägarregler

Registreringar och överföringar är transaktioner med samma fält:

```json
{
  "type": "REGISTER",
  "serialNumber": "ROLEX-SUB-9981",
  "fromAddress": "Manufacturer",
  "toAddress": "CollectorA",
  "timestamp": 1772188800000
}
```

- `REGISTER` registrerar ett serienummer och gör `toAddress` till första ägare. Ett serienummer kan bara registreras en gång.
- `TRANSFER` överför produkten från dess nuvarande ägare (`fromAddress`) till en ny ägare (`toAddress`).
- `timestamp` är ett valfritt positivt heltal i millisekunder. Servern skapar det om det saknas.
- Adresser och serienummer är icke-tomma strängar. Jämförelser sker efter trimning av inledande och avslutande blanksteg.

Affärsmodellen kontrollerar både bekräftad historik och väntande transaktioner innan en transaktion läggs till i kön. Därför kan en ägare skapa flera överföringar i följd, men en gammal ägare kan inte skicka en ny överföring efter en redan väntande överlåtelse. Historik och aktuell ägare i verifieringssvaret omfattar endast transaktioner i minerade block.

## REST API

Alla svar och fel använder JSON.

### `GET /api/chain`

Returnerar hela kedjan, väntande transaktioner, aktuell svårighet och integritetsstatus.

```json
{
  "chain": [
    {
      "index": 0,
      "timestamp": 1792138324279,
      "data": [],
      "previousHash": "0",
      "nonce": 0,
      "hash": "<SHA-256-hash>"
    }
  ],
  "pendingTransactions": [],
  "difficulty": 3,
  "isValid": true
}
```

### `POST /api/transactions`

Registrera en produkt eller överför ägandet. Svaret är `201 Created` med den accepterade transaktionen.

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/transactions `
  -ContentType "application/json" `
  -Body '{"type":"REGISTER","serialNumber":"ROLEX-SUB-9981","fromAddress":"Manufacturer","toAddress":"CollectorA"}'
```

Överföringsexempel:

```json
{
  "type": "TRANSFER",
  "serialNumber": "ROLEX-SUB-9981",
  "fromAddress": "CollectorA",
  "toAddress": "CollectorB"
}
```

Statuskoder:

- `201`: transaktionen godkänd och tillagd bland väntande transaktioner.
- `400`: saknad eller ogiltig payload, transaktionstyp, adress, serienummer eller tidsstämpel.
- `404`: försök att överföra en oregistrerad produkt.
- `409`: serienumret är redan registrerat eller avsändaren är inte aktuell ägare.

Exempelsvar:

```json
{
  "transaction": {
    "type": "REGISTER",
    "serialNumber": "ROLEX-SUB-9981",
    "fromAddress": "Manufacturer",
    "toAddress": "CollectorA",
    "timestamp": 1792138324279
  }
}
```

### `POST /api/mine`

Minerar de väntande transaktionerna till ett block och returnerar blocket med `201 Created`. Om kön är tom returneras `409 Conflict` med ett förklarande felmeddelande.

Exempelsvar:

```json
{
  "block": {
    "index": 1,
    "timestamp": 1792138324279,
    "data": [
      {
        "type": "REGISTER",
        "serialNumber": "ROLEX-SUB-9981",
        "fromAddress": "Manufacturer",
        "toAddress": "CollectorA",
        "timestamp": 1792138324279
      }
    ],
    "previousHash": "<hash från föregående block>",
    "nonce": 42,
    "hash": "<SHA-256-hash med rätt antal inledande nollor>"
  }
}
```

### `GET /api/verify/:id`

Ersätt `:id` med produktens serienummer. Vid träff returneras `exists`, `serialNumber`, fullständig bekräftad `history`, `currentOwner` och `chainValid`. Okänt serienummer ger `404 Not Found`.

Exempelsvar:

```json
{
  "exists": true,
  "serialNumber": "ROLEX-SUB-9981",
  "history": [
    {
      "type": "REGISTER",
      "serialNumber": "ROLEX-SUB-9981",
      "fromAddress": "Manufacturer",
      "toAddress": "CollectorA",
      "timestamp": 1792138324279
    }
  ],
  "currentOwner": "CollectorA",
  "chainValid": true
}
```

## Tester och TDD-commits

Kör hela testsviten:

```powershell
npm test
```

Vitest testar blockhashning, mining, kedjeintegritet och affärsregler. Supertest testar REST-endpoints inklusive felaktiga requests. Test- och implementation-commits skapades i separata röda/gröna steg:

| Steg | Commit |
| --- | --- |
| Röda tester för Block | `6a6e4d6` |
| Block-hash och mining | `54868d1` |
| Röda Blockchain-tester | `bb14f10` |
| Blockchain-implementation | `67e0434` |
| Röda tester för produktägande | `4e1d75b` |
| Affärsregler för ägande | `5b41fb3` |
| Röda API-integrationstester | `f6bb00f` |
| REST API-implementation | `df08e14` |

Commits finns i det lokala Git-repot. GitHub-länkar kan läggas till när commitsen har publicerats till fjärrrepot.

## Begränsningar

- Ingen databas eller beständig lagring används; om processen avslutas försvinner produkter, väntande transaktioner och hela kedjan.
- Adressfälten autentiserar inte avsändaren. En klient kan ange valfri adress; verklig ägarautentisering kräver bland annat nyckelhantering och verifierade digitala signaturer.
- Hashkedja och Proof-of-Work demonstrerar integritetskontroll men bevisar inte produktens äkthet eller historikens sanning. Det finns ingen distribuerad konsensus eller extern verifiering.
