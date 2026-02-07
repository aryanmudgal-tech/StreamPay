import json
from xrpl.wallet import Wallet

with open("wallets.json", "r") as f:
    data = json.load(f)

wallet_a = Wallet.from_seed(data["wallet_a"]["seed"])
wallet_b = Wallet.from_seed(data["wallet_b"]["seed"])

print("Loaded")
print("Wallet A:", wallet_a.classic_address)
print("Wallet B:", wallet_b.classic_address)