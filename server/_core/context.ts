import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { ADMIN_COOKIE_NAME, CUSTOMER_COOKIE_NAME } from "@shared/const";
import type { User } from "../../drizzle/schema";
import { parseCookieHeader, parseAdminToken } from "./adminSession";
import { verifyCustomerToken, type CustomerSessionPayload } from "./customerSession";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  isAdminSession: boolean;
  /** Email from the admin session token (empty string for legacy sessions without email). */
  adminEmail: string | null;
  customer: CustomerSessionPayload | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  const cookies = parseCookieHeader(opts.req.headers.cookie);
  const adminToken = parseAdminToken(cookies.get(ADMIN_COOKIE_NAME));
  const isAdminSession = adminToken !== null;
  const adminEmail = adminToken?.email || null;
  const customer = verifyCustomerToken(cookies.get(CUSTOMER_COOKIE_NAME));

  return {
    req: opts.req,
    res: opts.res,
    user,
    isAdminSession,
    adminEmail,
    customer,
  };
}
