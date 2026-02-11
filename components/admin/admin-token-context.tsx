"use client";
import { createContext, useContext } from "react";
export const AdminTokenContext = createContext<string | null>(null);
export function useAdminToken() { return useContext(AdminTokenContext); }
