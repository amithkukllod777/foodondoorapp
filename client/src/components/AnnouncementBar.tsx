import { trpc } from "@/lib/trpc";

export default function AnnouncementBar() {
  const { data: featuredCoupons } = trpc.coupons.getFeatured.useQuery();

  const coupon = featuredCoupons?.[0];

  const message = coupon
    ? `Enjoy Free Shipping on All Orders | ${
        coupon.discountType === "percent"
          ? `Get Extra ${coupon.discountValue}% OFF*`
          : `Flat ₹${coupon.discountValue} OFF*`
      } Use Code: ${coupon.code}`
    : "Free Shipping on All Orders | Shop Premium Dry Fruits at Foodondoor";

  return (
    <div className="bg-nutriorange text-primary-foreground text-xs sm:text-sm font-semibold py-2 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap">
        <span className="mx-8">{message}</span>
        <span className="mx-8">{message}</span>
        <span className="mx-8">{message}</span>
        <span className="mx-8">{message}</span>
      </div>
    </div>
  );
}
