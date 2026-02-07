import json
from xrpl.clients import JsonRpcClient
from xrpl.wallet import generate_faucet_wallet

JSON_RPC_URL = "https://testnet.xrpl-labs.com/"
client = JsonRpcClient(JSON_RPC_URL)

print("Creating Wallet A (sender) + funding...")
wallet_a = generate_faucet_wallet(client, debug=True)

print("\nCreating Wallet B (receiver) + funding...")
wallet_b = generate_faucet_wallet(client, debug=True)

data = {
    "wallet_a": {"seed": wallet_a.seed, "classic_address": wallet_a.classic_address},
    "wallet_b": {"seed": wallet_b.seed, "classic_address": wallet_b.classic_address},
}

with open("wallets.json", "w") as f:
    json.dump(data, f, indent=2)

print("\nSaved to wallets.json")
print("Wallet A:", wallet_a.classic_address)
print("Wallet B:", wallet_b.classic_address)