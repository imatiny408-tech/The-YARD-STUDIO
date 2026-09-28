"use client";
import { createContext, useContext } from "react";

// Minimal in-memory router so the whole app can run as a single HTML page.
export type Nav = { path: string; query: URLSearchParams; go: (href: string) => void };
export const NavCtx = createContext<Nav>({ path: "/", query: new URLSearchParams(), go: () => {} });
export const useNav = () => useContext(NavCtx);
