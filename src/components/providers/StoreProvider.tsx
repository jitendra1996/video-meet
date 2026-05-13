"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { hydrateToken, setUser } from "@/store/slices/authSlice";
import { ApiError, classroomFetch } from "@/lib/classroom-api";
import type { AuthUser } from "@/store/slices/authSlice";
import { logout } from "@/store/slices/authSlice";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const t = localStorage.getItem("classroom_token");
    store.dispatch(hydrateToken(t));
    if (t) {
      void classroomFetch<{ user: AuthUser }>("/api/v1/auth/me", { token: t })
        .then((data) => {
          store.dispatch(setUser(data.user));
        })
        .catch((e) => {
          if (e instanceof ApiError && e.status === 401) {
            store.dispatch(logout());
          }
        });
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
