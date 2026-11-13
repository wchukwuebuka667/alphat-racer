import { createPublicClient, defineChain, http, parseAbi } from "viem";
export const CONFIG = {
  token: import.meta.env.VITE_ALPHAT_TOKEN || "",
  minHold: Number(import.meta.env.VITE_MIN_HOLD || 1000),
  explorer: "https://explorer.testnet.chain.robinhood.com",
};
export const chain = defineChain({
  id: 46630, name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
});
export const client = createPublicClient({ chain, transport: http() });
const erc20 = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
]);
export const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export async function readHolding(token, who) {
  const c = { address: token, abi: erc20 };
  const [symbol, decimals, bal] = await Promise.all([
    client.readContract({ ...c, functionName: "symbol" }),
    client.readContract({ ...c, functionName: "decimals" }), // never hard-code decimals
    client.readContract({ ...c, functionName: "balanceOf", args: [who] }),
  ]);
  return { symbol, amount: Number(bal) / 10 ** decimals };
}
export async function connectWallet() {
  if (!window.ethereum) throw new Error("No wallet found. Install one or open this in a wallet browser.");
  const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
  const id = "0x" + chain.id.toString(16);
  try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: id }] }); }
  catch { await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: id, chainName: chain.name,
    nativeCurrency: chain.nativeCurrency, rpcUrls: chain.rpcUrls.default.http, blockExplorerUrls: [CONFIG.explorer] }] }); }
  return account;
}
