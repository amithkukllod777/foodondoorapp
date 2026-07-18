# Compliance Checklist

> Context: [`../company/master-context.md`](../company/master-context.md), [`../company/company-profile.md`](../company/company-profile.md).

Food + e-commerce compliance for Foodondoor Pvt Ltd / Nutriwow.

## Statutory

| Item | Status | Notes |
| --- | --- | --- |
| Company registration (CIN) | 🔲 | owner to confirm |
| GST registration (GSTIN) | 🔲 | invoices must show GST |
| **FSSAI license** | 🔲 | **mandatory for food business**; number must show on packaging & site |
| Trademark (Nutriwow brand) | 🔲 | owner to confirm |

## E-commerce / consumer

| Item | Status | Notes |
| --- | --- | --- |
| Privacy Policy | ✅ live | `client/src/pages/PrivacyPolicy.tsx` |
| Terms & Conditions | ✅ live | `TermsAndConditions.tsx` |
| Return Policy | ✅ live | `ReturnPolicy.tsx` |
| Refund Policy | ✅ live | `RefundPolicy.tsx` |
| Shipping Policy | ✅ live | `ShippingPolicy.tsx` |
| Contact / grievance officer | 🔲 | `Contact.tsx` exists; grievance officer per IT Rules 🔲 |

## Data / payments

- Payment data handled by gateways (Razorpay/PhonePe) — PCI scope minimized.
- OTP codes hashed + rate-limited in DB (source: `AUDIT_STATUS.md` #8).
- 🔲 DPDP Act (India data protection) review — owner/legal.

> ⚠️ This is an operational checklist, **not legal advice**. Confirm with a qualified professional.
