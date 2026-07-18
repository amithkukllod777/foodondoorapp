/**
 * ProductImageManager — Multi-image upload component for Admin product edit.
 * - Up to 8 images per product
 * - Hero image selection (shown as primary on website)
 * - Left/Right arrow button reordering (works on mobile & desktop)
 * - Delete individual images
 */

import { useState, useRef } from "react";
import { Upload, Loader2, Star, Trash2, Crown, ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ProductImage {
  id: number;
  productId: number;
  url: string;
  fileKey: string;
  isHero: boolean;
  sortOrder: number;
  createdAt: Date;
}

interface ProductImageManagerProps {
  productId: number;
}

export default function ProductImageManager({ productId }: ProductImageManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [localOrder, setLocalOrder] = useState<number[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: images = [], isLoading } = trpc.products.getImages.useQuery(
    { productId },
    { enabled: !!productId }
  );

  const orderedImages: ProductImage[] = localOrder
    ? (localOrder.map((id) => images.find((img) => img.id === id)).filter(Boolean) as ProductImage[])
    : images;

  const addImageMutation = trpc.products.addImage.useMutation({
    onSuccess: () => {
      toast.success("Image uploaded!");
      setLocalOrder(null);
      utils.products.getImages.invalidate({ productId });
      utils.products.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const setHeroMutation = trpc.products.setHeroImage.useMutation({
    onSuccess: () => {
      toast.success("Hero image updated!");
      utils.products.getImages.invalidate({ productId });
      utils.products.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteImageMutation = trpc.products.deleteImage.useMutation({
    onSuccess: () => {
      toast.success("Image deleted");
      setLocalOrder(null);
      utils.products.getImages.invalidate({ productId });
      utils.products.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const reorderMutation = trpc.products.reorderImages.useMutation({
    onSuccess: () => {
      utils.products.getImages.invalidate({ productId });
      utils.products.list.invalidate();
    },
    onError: () => {
      toast.error("Failed to save order");
      setLocalOrder(null);
    },
  });

  const moveImage = (index: number, direction: "left" | "right") => {
    const newOrder = orderedImages.map((img) => img.id);
    const swapIndex = direction === "left" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setLocalOrder(newOrder);
    reorderMutation.mutate({ productId, orderedIds: newOrder });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = 8 - images.length;
    if (remaining <= 0) {
      toast.error("Maximum 8 images allowed per product");
      return;
    }

    const toUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(`Only ${remaining} more image(s) can be added. Uploading first ${remaining}.`);
    }

    setUploading(true);
    try {
      for (const file of toUpload) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 20MB)`);
          continue;
        }
        const base64 = await fileToBase64(file);
        await addImageMutation.mutateAsync({
          productId,
          base64,
          filename: file.name,
          mimeType: file.type,
        });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSetHero = (image: ProductImage) => {
    if (image.isHero) return;
    setHeroMutation.mutate({ imageId: image.id, productId });
  };

  const handleDelete = (image: ProductImage) => {
    if (!confirm("Delete this image?")) return;
    deleteImageMutation.mutate({ imageId: image.id, productId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  const canAddMore = images.length < 8;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Product Images ({images.length}/8)
        </label>
        {canAddMore && (
          <label className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors">
            {uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Upload size={12} />
            )}
            {uploading ? "Uploading..." : "Add Images"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {images.length === 0 ? (
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 font-medium">Click to upload images</p>
          <p className="text-xs text-gray-400 mt-1">Up to 8 images, max 20MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {orderedImages.map((img, index) => (
            <div
              key={img.id}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                img.isHero
                  ? "border-green-500 shadow-md shadow-green-100"
                  : "border-gray-200"
              }`}
            >
              <img
                src={img.url}
                alt="Product"
                draggable={false}
                className="w-full aspect-square object-cover select-none"
              />

              {/* Hero badge */}
              {img.isHero && (
                <div className="absolute top-1 left-1 bg-green-500 text-white rounded-md px-1 py-0.5 flex items-center gap-0.5">
                  <Crown size={8} />
                  <span className="text-[8px] font-bold">HERO</span>
                </div>
              )}

              {/* Reorder arrows — bottom left/right */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-0.5 pb-0.5">
                <button
                  onClick={() => moveImage(index, "left")}
                  disabled={index === 0 || reorderMutation.isPending}
                  className="bg-black/60 hover:bg-black/80 disabled:opacity-20 disabled:cursor-not-allowed text-white rounded p-0.5 transition-colors"
                  title="Move left"
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  onClick={() => moveImage(index, "right")}
                  disabled={index === orderedImages.length - 1 || reorderMutation.isPending}
                  className="bg-black/60 hover:bg-black/80 disabled:opacity-20 disabled:cursor-not-allowed text-white rounded p-0.5 transition-colors"
                  title="Move right"
                >
                  <ChevronRight size={12} />
                </button>
              </div>

              {/* Top action buttons: hero + delete */}
              <div className="absolute top-1 right-1 flex flex-col gap-1">
                {!img.isHero && (
                  <button
                    onClick={() => handleSetHero(img)}
                    disabled={setHeroMutation.isPending}
                    title="Set as hero image"
                    className="bg-green-500 hover:bg-green-600 text-white rounded p-0.5 transition-colors"
                  >
                    <Star size={10} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(img)}
                  disabled={deleteImageMutation.isPending}
                  title="Delete image"
                  className="bg-red-500 hover:bg-red-600 text-white rounded p-0.5 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}

          {/* Add more slot */}
          {canAddMore && (
            <label className="border-2 border-dashed border-gray-200 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
              {uploading ? (
                <Loader2 size={16} className="animate-spin text-gray-400" />
              ) : (
                <>
                  <Upload size={16} className="text-gray-300 mb-1" />
                  <span className="text-[10px] text-gray-400">Add</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-[10px] text-gray-400">
          <Crown size={9} className="inline mr-0.5 text-green-500" />
          Hero image is shown as the main product image on website. Click ⭐ to change hero. Use ◀ ▶ arrows to reorder images.
        </p>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
