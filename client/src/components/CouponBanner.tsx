import { Tag, Copy } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function CouponBanner() {
  const { data: featuredCoupons } = trpc.coupons.getFeatured.useQuery();

  if (!featuredCoupons || featuredCoupons.length === 0) return null;

  const coupon = featuredCoupons[0];

  const discountText =
    coupon.discountType === "percent"
      ? `Get Extra ${coupon.discountValue}% OFF${coupon.minOrderAmount > 0 ? ` on orders above ₹${coupon.minOrderAmount}` : " on all orders"}!`
      : `Flat ₹${coupon.discountValue} OFF${coupon.minOrderAmount > 0 ? ` on orders above ₹${coupon.minOrderAmount}` : " on all orders"}!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code);
    toast.success("Coupon code copied!");
  };

  return (
    <section className="py-4">
      <div className="container">
        <div className="bg-primary rounded-3xl shadow-clay px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Tag size={24} className="flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">{discountText}</p>
              <p className="text-xs opacity-80">
                {coupon.description || "Use code at checkout for instant discount"}
              </p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 bg-card text-foreground px-5 py-2 rounded-full font-bold text-sm shadow-clay-sm transition-all active:translate-y-0.5 active:shadow-clay-pressed flex-shrink-0"
          >
            <span>{coupon.code}</span>
            <Copy size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
