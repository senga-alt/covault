import { LogOut, Wallet } from "lucide-react";
import { useWallet } from "../lib/wallet";
import { shortAddress } from "../lib/format";

export function WalletButton() {
  const { address, connecting, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="tnum rounded-[2px] border border-rule bg-ink-2 px-3 py-1.5 text-sm text-paper-dim">
          {shortAddress(address)}
        </span>
        <button
          onClick={disconnect}
          aria-label="Disconnect wallet"
          className="cursor-pointer rounded-[2px] border border-rule p-2 text-paper-dim transition-colors duration-200 hover:bg-ink-3 hover:text-paper"
        >
          <LogOut size={16} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="flex cursor-pointer items-center gap-2 rounded-[2px] bg-seal px-4 py-2 text-sm font-bold text-on-seal transition-colors duration-200 hover:bg-seal-hi disabled:opacity-50"
    >
      <Wallet size={16} aria-hidden />
      {connecting ? "Connecting..." : "Connect wallet"}
    </button>
  );
}
