/*
 * Admin editor for the navigation mega-menu: manage categories and their
 * subcategories (categories.getTree / setTree). Used in Admin → Products.
 */
import { useEffect, useState } from "react";
import { Plus, X, ChevronDown, Save, Loader2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Node = { category: string; subcategories: string[] };

export default function CategoryTreeEditor() {
  const utils = trpc.useUtils();
  const { data: serverTree } = trpc.categories.getTree.useQuery();
  const [tree, setTree] = useState<Node[]>([]);
  const [open, setOpen] = useState(false);
  const [subInputs, setSubInputs] = useState<Record<number, string>>({});

  useEffect(() => { if (serverTree) setTree(serverTree as Node[]); }, [serverTree]);

  const save = trpc.categories.setTree.useMutation({
    onSuccess: () => { utils.categories.getTree.invalidate(); toast.success("Menu saved"); },
    onError: (e) => toast.error(e.message),
  });

  const addCategory = () => {
    const name = window.prompt("New category name:");
    const t = (name || "").trim();
    if (!t) return;
    if (tree.some((n) => n.category.toLowerCase() === t.toLowerCase())) { toast.error("Category exists"); return; }
    setTree((prev) => [...prev, { category: t, subcategories: [] }]);
  };
  const removeCategory = (i: number) => setTree((prev) => prev.filter((_, idx) => idx !== i));
  const addSub = (i: number) => {
    const v = (subInputs[i] || "").trim();
    if (!v) return;
    setTree((prev) => prev.map((n, idx) => idx === i && !n.subcategories.some((s) => s.toLowerCase() === v.toLowerCase())
      ? { ...n, subcategories: [...n.subcategories, v] } : n));
    setSubInputs((s) => ({ ...s, [i]: "" }));
  };
  const removeSub = (i: number, sub: string) =>
    setTree((prev) => prev.map((n, idx) => idx === i ? { ...n, subcategories: n.subcategories.filter((s) => s !== sub) } : n));

  return (
    <div className="bg-white rounded-xl border border-gray-200 mt-2">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-800">
          <FolderTree size={15} className="text-[#43A047]" /> Navigation menu — categories & subcategories
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-[11px] text-gray-400 mb-3">These build the "Shop by Categories" dropdown on the store. Subcategories filter products by name keyword.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tree.map((node, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-bold text-gray-900">{node.category}</span>
                  <button onClick={() => removeCategory(i)} className="text-gray-300 hover:text-red-500" title="Remove category"><X size={14} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {node.subcategories.map((sub) => (
                    <span key={sub} className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-600 rounded-full pl-2 pr-1 py-0.5">
                      {sub}
                      <button onClick={() => removeSub(i, sub)} className="text-gray-400 hover:text-red-500"><X size={10} /></button>
                    </span>
                  ))}
                  {node.subcategories.length === 0 && <span className="text-[11px] text-gray-300">No subcategories</span>}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={subInputs[i] || ""}
                    onChange={(e) => setSubInputs((s) => ({ ...s, [i]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addSub(i)}
                    placeholder="Add subcategory"
                    className="flex-1 px-2.5 py-1.5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#43A047]"
                  />
                  <button onClick={() => addSub(i)} className="px-2 py-1.5 text-[#43A047] border border-[#43A047] rounded-lg hover:bg-green-50"><Plus size={13} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={addCategory} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#43A047] border border-[#43A047] rounded-lg px-3 py-1.5 hover:bg-green-50">
              <Plus size={13} /> Add category
            </button>
            <button onClick={() => save.mutate({ tree })} disabled={save.isPending}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-[#43A047] rounded-lg px-4 py-1.5 hover:bg-[#388E3C] disabled:opacity-60 ml-auto">
              {save.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
