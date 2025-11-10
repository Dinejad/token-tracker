import { createWalletClient, custom } from "https://esm.sh/viem@2";
import { mainnet, polygon, arbitrum } from "https://esm.sh/viem/chains";

const connectButton = document.getElementById("connectWallet");
const walletAddressDisplay = document.getElementById("walletAddress");
const tokenTableBody = document.querySelector("#tokenTable tbody");
const totalValueDisplay = document.getElementById("totalValue");
const ethPriceDisplay = document.getElementById("ethPriceDisplay");
const ensNameDisplay = document.getElementById("ensName");
const gasPriceDisplay = document.getElementById("gasPrice");
const tokenSearchInput = document.getElementById("tokenSearch");

const COVALENT_API_KEY = "cqt_rQWm9fdx3v3DJ6KF3fQ9wtym877K";

let walletAddress = null;
let currentChain = "eth-mainnet"; // default
let refreshInterval;

// ===============================
// 🪙 FETCH REAL-TIME PRICES
// ===============================
async function getEthPriceUSD() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,polygon,arbitrum&vs_currencies=usd"
    );
    const data = await res.json();
    const ethPrice = data.ethereum.usd;

    if (ethPriceDisplay)
      ethPriceDisplay.textContent = `ETH Price: $${ethPrice.toFixed(2)}`;
    return ethPrice;
  } catch (e) {
    console.error("❌ Failed to fetch ETH price:", e);
    return null;
  }
}

// ===============================
// 🧠 ENS + GAS PRICE
// ===============================
async function getENSName(address) {
  try {
    const response = await fetch(`https://api.ensideas.com/ens/resolve/${address}`);
    const data = await response.json();
    ensNameDisplay.textContent = data.name ? `ENS: ${data.name}` : "ENS: —";
  } catch {
    ensNameDisplay.textContent = "ENS: —";
  }
}

async function getGasPrice() {
  try {
    const res = await fetch(
      "https://api.etherscan.io/api?module=gastracker&action=gasoracle"
    );
    const data = await res.json();
    const gas = data.result.ProposeGasPrice;
    gasPriceDisplay.textContent = `Gas Price: ${gas} Gwei`;
  } catch {
    gasPriceDisplay.textContent = "Gas Price: —";
  }
}
setInterval(getGasPrice, 15000);
getGasPrice();

// ===============================
// 🌐 CHAIN SELECTOR
// ===============================
const chainSelector = document.createElement("select");
chainSelector.id = "chainSelector";
chainSelector.innerHTML = `
  <option value="eth-mainnet">Ethereum</option>
  <option value="matic-mainnet">Polygon</option>
  <option value="arbitrum-mainnet">Arbitrum</option>
`;
chainSelector.style.marginLeft = "10px";
connectButton.insertAdjacentElement("afterend", chainSelector);

chainSelector.addEventListener("change", async (e) => {
  currentChain = e.target.value;
  if (walletAddress) await loadPortfolio(walletAddress);
});

// ===============================
// 🦊 CONNECT WALLET
// ===============================
connectButton.addEventListener("click", async () => {
  try {
    if (!window.ethereum) return alert("Please install MetaMask!");

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    walletAddress = accounts[0];
    walletAddressDisplay.textContent = `Connected: ${walletAddress}`;
    connectButton.textContent = "Connected ✅";

    await getENSName(walletAddress);
    await loadPortfolio(walletAddress);
  } catch (err) {
    console.error(err);
  }
});

// ===============================
// 📈 FETCH TOKEN SPARKLINE DATA
// ===============================
async function getSparkline(symbol) {
  const idMap = {
    ETH: "ethereum",
    MATIC: "polygon",
    ARB: "arbitrum",
    USDC: "usd-coin",
    USDT: "tether",
  };
  const id = idMap[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=7&interval=daily`
    );
    const data = await res.json();
    return data.prices.map((p) => p[1]);
  } catch {
    return null;
  }
}

// ===============================
// 📊 LOAD PORTFOLIO
// ===============================
async function loadPortfolio(address) {
  try {
    tokenTableBody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";

    const selectedChain = chainSelector.value;
    const ethPrice = await getEthPriceUSD();

    const response = await fetch(
      `https://api.covalenthq.com/v1/${selectedChain}/address/${address}/balances_v2/?key=${COVALENT_API_KEY}`
    );
    const data = await response.json();

    const tokens = data.data.items.filter(
      (t) => t.balance > 0 && t.contract_decimals > 0
    );

    tokenTableBody.innerHTML = "";
    let totalUsd = 0;

    for (const token of tokens) {
      const balance = token.balance / Math.pow(10, token.contract_decimals);
      const price =
        token.contract_ticker_symbol === "ETH" ? ethPrice : token.quote_rate || 0;
      const value = balance * price;
      totalUsd += value;

      const row = document.createElement("tr");
      const sparkline = await getSparkline(token.contract_ticker_symbol);

      row.innerHTML = `
        <td>${token.contract_ticker_symbol}</td>
        <td>${balance.toFixed(4)}</td>
        <td>$${price.toFixed(2)}</td>
        <td>$${value.toFixed(2)}</td>
        <td><canvas id="spark-${token.contract_ticker_symbol}" width="80" height="30"></canvas></td>
      `;
      tokenTableBody.appendChild(row);

      if (sparkline) renderSparkline(`spark-${token.contract_ticker_symbol}`, sparkline);
    }

    totalValueDisplay.textContent = `Total Value: $${totalUsd.toFixed(2)}`;
  } catch (err) {
    console.error("Error loading portfolio:", err);
    tokenTableBody.innerHTML =
      "<tr><td colspan='5'>Failed to load data</td></tr>";
  }
}

// ===============================
// ⚡ RENDER SPARKLINES (Mini Charts)
// ===============================
function renderSparkline(canvasId, prices) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const scaleX = canvas.width / (prices.length - 1);
  const scaleY = canvas.height / (max - min);

  ctx.beginPath();
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 1.5;

  prices.forEach((p, i) => {
    const x = i * scaleX;
    const y = canvas.height - (p - min) * scaleY;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

// ===============================
// 🔁 AUTO REFRESH EVERY 30s
// ===============================
function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (walletAddress) loadPortfolio(walletAddress);
  }, 30000);
}

startAutoRefresh();

// ===============================
// 🔍 TOKEN SEARCH
// ===============================
tokenSearchInput.addEventListener("input", () => {
  const searchTerm = tokenSearchInput.value.toLowerCase();
  const rows = tokenTableBody.querySelectorAll("tr");
  rows.forEach((row) => {
    const token = row.querySelector("td:first-child").textContent.toLowerCase();
    row.style.display = token.includes(searchTerm) ? "" : "none";
  });
});
