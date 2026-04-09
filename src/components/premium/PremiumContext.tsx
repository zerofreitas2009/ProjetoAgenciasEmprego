import React, { createContext, useContext, useMemo, useState } from "react";
import { PremiumUpgradeModal } from "@/components/premium/PremiumUpgradeModal";

type PremiumReason = "limit" | "upgrade";

type PremiumContextValue = {
  openPremium: (reason?: PremiumReason) => void;
};

const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);

export function PremiumProvider({
  agencyName,
  children,
}: {
  agencyName: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<PremiumReason>("upgrade");

  const value = useMemo<PremiumContextValue>(
    () => ({
      openPremium: (r) => {
        setReason(r ?? "upgrade");
        setOpen(true);
      },
    }),
    []
  );

  return (
    <PremiumContext.Provider value={value}>
      {children}
      <PremiumUpgradeModal
        open={open}
        onOpenChange={setOpen}
        agencyName={agencyName}
        reason={reason}
      />
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
  return ctx;
}
