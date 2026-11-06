"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { sb } from "./supabase";
import type { Role } from "./content";
import type { Contraception } from "./cycle";

export type Me = {
  user_id: string;
  couple_id: string;
  role: Role;
  name: string;
  contraception: Contraception;
  avg_cycle_length: number;
  timezone: string;
  onboarded_at: string | null;
};
export type Share = {
  share_phase: boolean;
  share_mood: "full" | "simple" | "off";
  share_symptoms: "detailed" | "category" | "off";
  paused_at: string | null;
  confirmed_at: string | null;
};
export type Partner = {
  user_id: string;
  role: Role;
  name: string;
  timezone: string;
  contraception: Contraception | null;
  avg_cycle_length: number | null;
  is_paused: boolean;
  sharing_confirmed: boolean;
};
export type Pet = { id: string; name: string; photo_path: string | null; vaccine_due: string | null; dewormer_due: string | null; flea_due: string | null };

type Ctx = {
  ready: boolean;
  session: Session | null;
  me: Me | null;
  share: Share | null;
  partner: Partner | null;
  inviteCode: string | null;
  pets: Pet[];
  refresh: () => Promise<void>;
};

const AppCtx = createContext<Ctx>({ ready: false, session: null, me: null, share: null, partner: null, inviteCode: null, pets: [], refresh: async () => {} });

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<Ctx, "refresh">>({ ready: false, session: null, me: null, share: null, partner: null, inviteCode: null, pets: [] });

  const load = useCallback(async (session: Session | null) => {
    if (!session) {
      setState({ ready: true, session: null, me: null, share: null, partner: null, inviteCode: null, pets: [] });
      return;
    }
    const db = sb();
    const [me, share, partner, couple, pets] = await Promise.all([
      db.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
      db.from("share_settings").select("*").eq("user_id", session.user.id).maybeSingle(),
      db.from("partner_profile").select("*").maybeSingle(),
      db.from("couples").select("invite_code").maybeSingle(),
      db.from("pets").select("*").order("created_at"),
    ]);
    setState({
      ready: true,
      session,
      me: (me.data as Me) ?? null,
      share: (share.data as Share) ?? null,
      partner: (partner.data as Partner) ?? null,
      inviteCode: couple.data?.invite_code ?? null,
      pets: (pets.data as Pet[]) ?? [],
    });
  }, []);

  useEffect(() => {
    const db = sb();
    db.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load(session);
      else if (event === "TOKEN_REFRESHED") setState((s) => ({ ...s, session }));
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await sb().auth.getSession();
    await load(data.session);
  }, [load]);

  return <AppCtx.Provider value={{ ...state, refresh }}>{children}</AppCtx.Provider>;
}

export const useApp = () => useContext(AppCtx);

export function partnerWord(role: Role | undefined) {
  return role === "her" ? "ela" : "ele";
}
