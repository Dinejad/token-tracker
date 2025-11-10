import { createWalletClient, custom } from "https://esm.sh/viem@2";
import { mainnet } from "https://esm.sh/viem/chains";

const connectButton = document.getElementById("connectWallet");
const walletAddressDisplay = document.getElementById("walletAddress");
const tokenTableBody = document.querySelector("#tokenTable tbody");
const totalValueDisplay = document.getElementById("totalValue");

// 👇 Optional: display ETH price somewhere (like in header)
const ethPriceDisplay = document.getElementById("ethPriceDisplay");

const COVALENT_API_KEY = "cqt_rQWm9fdx3v3DJ6KF3fQ9wtym877K"; // 🔑 Replace with your key

let walletAddress = null;

// ===============================
// 🪙 FETCH REAL-TIME ETH PRICE
// ===============================
async function getEthPriceUSD() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const data = await res.json();
    const ethPrice = data.ethereum.usd;

    // Update display if element exists
    if (ethPriceDisplay) {
      ethPriceDisplay.textContent = `ETH Price: $${ethPrice}`;
    }

    return ethPrice;
  } catch (e) {
    console.error("❌ Failed to fetch ETH price:", e);
    return null;
  }
}

connectButton.addEventListener("click", async () => {
  try {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    walletAddress = accounts[0];
    walletAddressDisplay.textContent = `Connected: ${walletAddress}`;
    connectButton.textContent = "Connected ✅";

    await loadPortfolio(walletAddress);
  } catch (error) {
    console.error(error);
  }
});

async function loadPortfolio(address) {
  try {
    tokenTableBody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

    // 👇 Fetch ETH price first
    const ethPrice = await getEthPriceUSD();

    const response = await fetch(
      `https://api.covalenthq.com/v1/eth-mainnet/address/${address}/balances_v2/?key=${COVALENT_API_KEY}`
    );
    const data = await response.json();

    const tokens = data.data.items.filter(
      (t) => t.balance > 0 && t.contract_decimals > 0
    );

    tokenTableBody.innerHTML = "";

    let totalUsd = 0;

    tokens.forEach((token) => {
      const balance = token.balance / Math.pow(10, token.contract_decimals);
      const price =
        token.contract_ticker_symbol === "ETH"
          ? ethPrice // 👈 Override ETH price from CoinGecko
          : token.quote_rate || 0;
      const value = balance * price;
      totalUsd += value;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${token.contract_ticker_symbol}</td>
        <td>${balance.toFixed(4)}</td>
        <td>$${price.toFixed(2)}</td>
        <td>$${value.toFixed(2)}</td>
      `;
      tokenTableBody.appendChild(row);
    });

    totalValueDisplay.textContent = `Total Value: $${totalUsd.toFixed(2)}`;
  } catch (err) {
    console.error("Error loading portfolio:", err);
    tokenTableBody.innerHTML = "<tr><td colspan='4'>Failed to load data</td></tr>";
  }
}
