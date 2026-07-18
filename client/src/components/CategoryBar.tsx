import { categories } from "@/lib/products";

export default function CategoryBar() {
  return (
    <section className="bg-background py-3 lg:hidden">
      <div className="container">
        <div className="flex gap-4 overflow-x-auto hide-scrollbar">
          {categories.map((cat) => (
            <a
              key={cat.name}
              href={`#${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="flex flex-col items-center gap-1.5 min-w-[60px] group"
            >
              <div className="w-12 h-12 rounded-full bg-clay-green shadow-clay-sm flex items-center justify-center group-hover:scale-110 transition-all">
                <img src={cat.icon} alt={cat.name} className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground text-center whitespace-nowrap group-hover:text-primary transition-colors">
                {cat.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
