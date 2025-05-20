import { interpretRuneTransaction } from "./transactionHelpers";
import { RuneActivityEvent } from "@/types/ordiscan";

describe("interpretRuneTransaction", () => {
  const userAddress = "bc1qtest123456789";

  // Test case 1: Minting transaction
  it("correctly interprets a minting transaction", () => {
    const mintTx: RuneActivityEvent = {
      txid: "abcd1234",
      timestamp: "2023-01-01T00:00:00Z",
      runestone_messages: [
        {
          type: "MINT",
          rune: "BITCOIN",
        },
      ],
      inputs: [
        {
          address: userAddress,
          output: "txid:0",
          rune: "",
          rune_amount: "",
        },
      ],
      outputs: [
        {
          address: userAddress,
          vout: 0,
          rune: "BITCOIN",
          rune_amount: "1000",
        },
      ],
    };

    const result = interpretRuneTransaction(mintTx, userAddress);
    expect(result.action).toBe("Minted");
    expect(result.runeName).toBe("BITCOIN");
    expect(result.runeAmountRaw).toBe("1000");
  });

  // Test case 2: Etching transaction
  it("correctly interprets an etching transaction", () => {
    const etchTx: RuneActivityEvent = {
      txid: "abcd5678",
      timestamp: "2023-01-01T00:00:00Z",
      runestone_messages: [
        {
          type: "ETCH",
          rune: "NEWRUNE",
        },
      ],
      inputs: [
        {
          address: userAddress,
          output: "txid:0",
          rune: "",
          rune_amount: "",
        },
      ],
      outputs: [
        {
          address: userAddress,
          vout: 0,
          rune: "NEWRUNE",
          rune_amount: "5000",
        },
      ],
    };

    const result = interpretRuneTransaction(etchTx, userAddress);
    expect(result.action).toBe("Etched");
    expect(result.runeName).toBe("NEWRUNE");
    expect(result.runeAmountRaw).toBe("5000");
  });

  // Test case 3: Sending transaction
  it("correctly interprets a sending transaction", () => {
    const sendTx: RuneActivityEvent = {
      txid: "efgh1234",
      timestamp: "2023-01-01T00:00:00Z",
      runestone_messages: [
        {
          type: "TRANSFER",
          rune: "BITCOIN",
        },
      ],
      inputs: [
        {
          address: userAddress,
          output: "txid:0",
          rune: "BITCOIN",
          rune_amount: "500",
        },
      ],
      outputs: [
        {
          address: "bc1qrecipient987654321",
          vout: 0,
          rune: "BITCOIN",
          rune_amount: "500",
        },
      ],
    };

    const result = interpretRuneTransaction(sendTx, userAddress);
    expect(result.action).toBe("Sent");
    expect(result.runeName).toBe("BITCOIN");
    expect(result.runeAmountRaw).toBe("500");
  });

  // Test case 4: Receiving transaction
  it("correctly interprets a receiving transaction", () => {
    const receiveTx: RuneActivityEvent = {
      txid: "ijkl1234",
      timestamp: "2023-01-01T00:00:00Z",
      runestone_messages: [
        {
          type: "TRANSFER",
          rune: "BITCOIN",
        },
      ],
      inputs: [
        {
          address: "bc1qsender987654321",
          output: "txid:0",
          rune: "BITCOIN",
          rune_amount: "300",
        },
      ],
      outputs: [
        {
          address: userAddress,
          vout: 0,
          rune: "BITCOIN",
          rune_amount: "300",
        },
      ],
    };

    const result = interpretRuneTransaction(receiveTx, userAddress);
    expect(result.action).toBe("Received");
    expect(result.runeName).toBe("BITCOIN");
    expect(result.runeAmountRaw).toBe("300");
  });

  // Test case 5: Internal transfer transaction
  it("correctly interprets an internal transfer transaction", () => {
    const internalTx: RuneActivityEvent = {
      txid: "mnop1234",
      timestamp: "2023-01-01T00:00:00Z",
      runestone_messages: [
        {
          type: "TRANSFER",
          rune: "BITCOIN",
        },
      ],
      inputs: [
        {
          address: userAddress,
          output: "txid:0",
          rune: "BITCOIN",
          rune_amount: "200",
        },
      ],
      outputs: [
        {
          address: userAddress,
          vout: 0,
          rune: "BITCOIN",
          rune_amount: "200",
        },
      ],
    };

    const result = interpretRuneTransaction(internalTx, userAddress);
    expect(result.action).toBe("Internal Transfer");
    expect(result.runeName).toBe("BITCOIN");
    expect(result.runeAmountRaw).toBe("200");
  });

  // Test case 6: External transfer transaction
  it("correctly interprets an external transfer transaction", () => {
    const externalTx: RuneActivityEvent = {
      txid: "qrst1234",
      timestamp: "2023-01-01T00:00:00Z",
      runestone_messages: [
        {
          type: "TRANSFER",
          rune: "BITCOIN",
        },
      ],
      inputs: [
        {
          address: "bc1qsender111111111",
          output: "txid:0",
          rune: "BITCOIN",
          rune_amount: "100",
        },
      ],
      outputs: [
        {
          address: "bc1qrecipient222222222",
          vout: 0,
          rune: "BITCOIN",
          rune_amount: "100",
        },
      ],
    };

    const result = interpretRuneTransaction(externalTx, userAddress);
    expect(result.action).toBe("Transfer (External)");
    expect(result.runeName).toBe("BITCOIN");
    expect(result.runeAmountRaw).toBe("N/A");
  });

  // Test case 7: Error handling
  it("handles errors gracefully", () => {
    const invalidTx = {} as RuneActivityEvent; // Invalid transaction data

    const result = interpretRuneTransaction(invalidTx, userAddress);
    expect(result.action).toBe("Unknown");
    expect(result.runeName).toBe("N/A");
    expect(result.runeAmountRaw).toBe("N/A");
  });
});
