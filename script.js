import { createWalletClient, custom, formatEther } from "https://esm.sh/viem@2";
import { mainnet } from "https://esm.sh/viem/chains";

const connectButton = document.getElementById("connectWallet");
const walletAddressDisplay = document.getElementById("walletAddress");

let client;

connectButton.addEventListener("click", async () => {
  try {
    // check if MetaMask is installed
    if (!window.ethereum) {
      alert("Please install MetaMask first!");
      return;
    }

    // request wallet access
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const address = accounts[0];

    // initialize viem wallet client
    client = createWalletClient({
      chain: mainnet,
      transport: custom(window.ethereum),
    });

    walletAddressDisplay.textContent = `Connected: ${address}`;
    connectButton.textContent = "Connected ✅";
  } catch (err) {
    console.error("Connection error:", err);
  }
});
