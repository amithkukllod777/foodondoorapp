import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, ArrowUp, ArrowDown, Upload, Loader2, Image as ImageIcon, Save } from "lucide-react";
import { toast } from "sonner";

type Slide = { id: string; desktopImage: string; mobileImage?: string; appImage?: string; link?: string; alt?: string };

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

type BannerField = "desktopImage" | "mobileImage" | "appImage";

/** Standard banner sizes — every upload is center-cropped to these so all slides look identical. */
const BANNER_SIZES = {
  desktopImage: { w: 1920, h: 640 }, // 3:1 wide (website desktop)
  mobileImage: { w: 1080, h: 1080 }, // square (website mobile browser)
  appImage: { w: 1200, h: 600 },     // 2:1 (mobile app banner)
} as const;

/**
 * Center-crop + resize an image in the browser to the EXACT target banner size,
 * re-encoded as JPEG. This keeps every slide perfectly uniform and the base64
 * payload well under Vercel's ~4.5 MB serverless request-body limit.
 */
async function compressImage(
  file: File,
  target: { w: number; h: number },
  quality = 0.85,
): Promise<{ base64: string; mimeType: string; filename: string }> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = dataUrl;
  });
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = target.w;
  canvas.height = target.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // Fallback: send original
    return { base64: dataUrl.split(",")[1], mimeType: file.type || "image/jpeg", filename: file.name };
  }
  // Cover-crop: scale to fill the target box, crop overflow equally from both sides.
  const scale = Math.max(target.w / iw, target.h / ih);
  const sw = target.w / scale;
  const sh = target.h / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, target.w, target.h);
  const out = canvas.toDataURL("image/jpeg", quality);
  const base = file.name.replace(/\.[^.]+$/, "");
  return { base64: out.split(",")[1], mimeType: "image/jpeg", filename: `${base}.jpg` };
}

export default function HeroCarouselManager() {
  const { data: saved, refetch } = trpc.homepage.getCarousel.useQuery();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const upload = trpc.homepage.uploadBanner.useMutation();
  const save = trpc.homepage.setCarousel.useMutation({
    onSuccess: () => { toast.success("Carousel saved & live!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (!loaded && saved) { setSlides((saved as Slide[]) || []); setLoaded(true); }
  }, [saved, loaded]);

  const addSlide = () =>
    setSlides((s) => [...s, { id: uid(), desktopImage: "", mobileImage: "", appImage: "", link: "", alt: "" }]);
  const removeSlide = (id: string) => setSlides((s) => s.filter((x) => x.id !== id));
  const update = (id: string, patch: Partial<Slide>) =>
    setSlides((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const move = (i: number, dir: -1 | 1) =>
    setSlides((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const c = [...s];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const handleFile = async (id: string, field: BannerField, file: File) => {
    if (!file) return;
    const key = `${id}:${field}`;
    setUploading(key);
    try {
      const { base64, mimeType, filename } = await compressImage(file, BANNER_SIZES[field]);
      const { url } = await upload.mutateAsync({ base64, filename, mimeType });
      update(id, { [field]: url } as Partial<Slide>);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error("Upload failed: " + (e?.message || "unknown"));
    } finally {
      setUploading(null);
    }
  };

  const handleSave = () => {
    const clean = slides.filter((s) => s.desktopImage.trim());
    save.mutate({ slides: clean });
  };

  const ImgCell = ({ slide, field, label }: { slide: Slide; field: BannerField; label: string }) => {
    const url = (slide as any)[field] as string;
    const busy = uploading === `${slide.id}:${field}`;
    return (
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
        <label className="block cursor-pointer">
          <div className="h-24 rounded-lg border-2 border-dashed border-gray-200 hover:border-amber-400 bg-gray-50 flex items-center justify-center overflow-hidden">
            {busy ? (
              <Loader2 className="animate-spin text-amber-500" size={20} />
            ) : url ? (
              <img src={url} alt="" className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <Upload size={18} />
                <span className="text-[10px] mt-1">Upload</span>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(slide.id, field, f); e.currentTarget.value = ""; }}
          />
        </label>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon size={18} className="text-amber-500" /> Hero Carousel
          </h2>
          <p className="text-xs text-gray-500">Homepage banner slides — desktop + mobile image per slide. Auto-rotates.</p>
        </div>
        <Button onClick={handleSave} disabled={save.isPending} className="bg-amber-500 hover:bg-amber-600">
          {save.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          <span className="ml-1">Save</span>
        </Button>
      </div>

      {/* Banner size guide */}
      <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-900 space-y-1">
        <p className="font-semibold">📐 Banner Size Guide — teeno platform ke liye alag image:</p>
        <p>• <strong>Website Desktop:</strong> 1920 × 640 px (3:1 wide)</p>
        <p>• <strong>Website Mobile:</strong> 1080 × 1080 px (square) — na ho to desktop wali use hogi</p>
        <p>• <strong>Mobile App:</strong> 1200 × 600 px (2:1) — na ho to mobile/desktop wali use hogi</p>
        <p>• Koi bhi size upload karein — system <strong>automatic center-crop</strong> karke exact size me fit kar dega. Product/text ko image ke <strong>beech (center)</strong> me rakhein.</p>
      </div>

      <div className="space-y-3">
        {slides.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No slides yet. Add one below. (When empty, the default banner is shown.)</p>
        )}
        {slides.map((slide, i) => (
          <div key={slide.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Slide {i + 1}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowUp size={16} /></button>
                <button onClick={() => move(i, 1)} disabled={i === slides.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ArrowDown size={16} /></button>
                <button onClick={() => removeSlide(slide.id)} className="p-1 text-red-400 hover:text-red-600"><X size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <ImgCell slide={slide} field="desktopImage" label="Website Desktop — 1920×640 (3:1)" />
              <ImgCell slide={slide} field="mobileImage" label="Website Mobile — 1080×1080 (square)" />
              <ImgCell slide={slide} field="appImage" label="Mobile App — 1200×600 (2:1)" />
            </div>
            <Input
              value={slide.link || ""}
              onChange={(e) => update(slide.id, { link: e.target.value })}
              placeholder="Optional link, e.g. /collections/Nuts or https://…"
              className="text-sm"
            />
          </div>
        ))}
      </div>

      <Button onClick={addSlide} variant="outline" className="mt-3 w-full border-dashed">
        <Plus size={16} className="mr-1" /> Add slide
      </Button>
    </div>
  );
}
