import { LogOut, Wallet } from "lucide-react";
import { useWallet } from "../lib/wallet";
import { shortAddress } from "../lib/format";

export function WalletButton() {
  const { address, connecting, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div className="flex items-center gap-2">
        <span className="tnum rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
          {shortAddress(address)}
        </span>
        <button
          onClick={disconnect}
          aria-label="Disconnect wallet"
          className="cursor-pointer rounded-md border border-border p-2 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
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
      className="flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors duration-150 hover:bg-secondary disabled:opacity-50"
    >
      <Wallet size={16} aria-hidden />
      {connecting ? "Connecting..." : "Connect wallet"}
    </button>
  );
}
