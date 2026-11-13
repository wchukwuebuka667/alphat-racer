import { useEffect, useState } from "react";
import Game from "./Game.jsx";
import { CONFIG, connectWallet, readHolding, short } from "./chain.js";

export default function App() {
  const [account, setAccount] = useState(null);
  const [hold, setHold] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!account || !CONFIG.token) return;
    const load = () => readHolding(CONFIG.token, account).then(setHold).catch(() => setError("Couldn't read the token. Check VITE_ALPHAT_TOKEN."));
    load(); const t = setInterval(load, 20000); return () => clearInterval(t);
  }, [account]);

  async function connect() { setError(""); try { setAccount(await connectWallet()); } catch (e) { setError(e.message); } }
  const perk = !!hold && hold.amount >= CONFIG.minHold;

  return (
    <div className="shell">
      <nav>
        <span className="tag">● TESTNET · CHAIN 46630</span>
        <span className="grow" />
        {account
          ? <span className="tag">{short(account)} <button className="ghost" onClick={() => { setAccount(null); setHold(null); }}>DISCONNECT</button></span>
          : <button onClick={connect}>CONNECT WALLET</button>}
      </nav>
      <div className="stripe" />
      <main className="layout">
        <section className="hero">
          <h1>ALPHAT<br /><span>RACER</span></h1>
          <p className="lede">Dodge the traffic. Beat your best. Hold the token for a gold car and a shield.</p>
          <div className="pit">
            <h2>PIT STOP</h2>
            {error && <p className="err">{error}</p>}
            {!CONFIG.token ? <p>Token not launched yet. The holder perk goes live after launch.</p>
              : !account ? <p>Connect a wallet to check for the holder perk.</p>
              : <p>{hold ? `${hold.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${hold.symbol} in your wallet` : "Reading your balance…"}</p>}
            <p className={perk ? "perk on" : "perk"}>{perk ? "PERK ACTIVE: GOLD CAR + SHIELD" : `HOLD ${CONFIG.minHold.toLocaleString()} FOR GOLD CAR + SHIELD`}</p>
          </div>
          <p className="keys">← → or A D to steer · tap left or right on phone · no wallet needed to play · scores save on this device · testnet only, not financial advice</p>
        </section>
        <Game perk={perk} />
      </main>
    </div>
  );
}
