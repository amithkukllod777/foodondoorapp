/**
 * Admin Reviews Management Page
 * Simple admin table (bg-white, NOT clay design)
 */

import { useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminReviews() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: reviews = [], refetch, isLoading } = trpc.reviews.adminList.useQuery(
    statusFilter === "all" ? {} : { status: statusFilter },
  );

  const moderateMutation = trpc.reviews.moderate.useMutation({
    onSuccess: () => {
      toast.success("Review status updated");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <AdminLayout title="Reviews" subtitle={`${reviews.length} reviews`}>
      <div className="p-4 lg:p-6">
        {/* Status filter tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                statusFilter === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No reviews found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Review</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviews.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 max-w-[180px] truncate">
                          {review.productName || `Product #${review.productId}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-700">{review.customerName}</span>
                          {review.verified && (
                            <CheckCircle2 size={12} className="text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200"}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[300px]">
                        {review.title && (
                          <p className="text-sm font-medium text-gray-900 truncate">{review.title}</p>
                        )}
                        <p className="text-xs text-gray-500 line-clamp-2">{review.body || "No review text"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          review.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : review.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {review.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(review.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {review.status !== "approved" && (
                            <button
                              onClick={() => moderateMutation.mutate({ reviewId: review.id, status: "approved" })}
                              disabled={moderateMutation.isPending}
                              className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                          )}
                          {review.status !== "rejected" && (
                            <button
                              onClick={() => moderateMutation.mutate({ reviewId: review.id, status: "rejected" })}
                              disabled={moderateMutation.isPending}
                              className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
