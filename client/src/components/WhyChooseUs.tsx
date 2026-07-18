import { Truck, ShieldCheck, Leaf, Award } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Free Shipping",
    desc: "On all orders across India",
    tint: "bg-clay-green",
  },
  {
    icon: ShieldCheck,
    title: "100% Secure",
    desc: "Safe & secure payments",
    tint: "bg-clay-peach",
  },
  {
    icon: Leaf,
    title: "100% Natural",
    desc: "No preservatives added",
    tint: "bg-clay-butter",
  },
  {
    icon: Award,
    title: "Premium Quality",
    desc: "Handpicked & fresh",
    tint: "bg-clay-pink",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-6 bg-clay-green/60">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-3 bg-card rounded-3xl px-4 py-3 shadow-clay hover:-translate-y-1 transition-all"
            >
              <div className={`w-10 h-10 rounded-full ${f.tint} shadow-clay-sm flex items-center justify-center flex-shrink-0`}>
                <f.icon size={20} className="text-nutrigreen" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{f.title}</p>
                <p className="text-[10px] text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
