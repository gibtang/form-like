import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge runtime: imports ONLY the DB-free authConfig. Do not import
// "@/auth" here — it pulls in the mongodb client and breaks the Edge bundle.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
