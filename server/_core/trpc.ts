import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requireCustomer = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.customer) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login to continue." });
  }
  return next({ ctx: { ...ctx, customer: ctx.customer } });
});

export const customerProcedure = t.procedure.use(requireCustomer);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Grant access via EITHER the OAuth owner role (ctx.user.role === 'admin')
    // OR a valid signed admin-panel session cookie (ctx.isAdminSession).
    const isAdmin = ctx.user?.role === 'admin' || ctx.isAdminSession === true;
    if (!isAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// NW-AUTHZ-01: least-privilege gate for the most sensitive admin operations
// (admin-user management, etc.). Blocks the "manager" role while allowing
// owner/admin roles, OAuth owner, and legacy shared-password sessions — so it
// never locks out an existing owner/admin. Managers keep normal adminProcedure
// access to day-to-day operations; only privilege-escalation-prone actions are
// gated here.
export const ownerProcedure = adminProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    // OAuth owner and legacy shared-password sessions (no email) = full access.
    if (ctx.user?.role === 'admin' || !ctx.adminEmail) return next({ ctx });
    const { getAdminUserByEmail } = await import("../db");
    const admin = await getAdminUserByEmail(ctx.adminEmail);
    if (admin && admin.role === 'manager') {
      throw new TRPCError({ code: "FORBIDDEN", message: "This action requires an owner or admin account." });
    }
    return next({ ctx });
  }),
);
