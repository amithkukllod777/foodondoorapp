/*
 * Foodondoor Admin - Blog Management Page
 * Shows all blogs with status badges, publish/unpublish/delete actions
 * Links to BlogEditor for create/edit
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Plus, Trash2, Eye, EyeOff, Edit2, BookOpen, Search, Filter,
  Calendar, User, Tag, Globe, FileText, Loader2, AlertTriangle,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type BlogStatus = "draft" | "published";

interface ConfirmDialog {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export default function AdminBlogs() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | BlogStatus>("all");
  const [confirm, setConfirm] = useState<ConfirmDialog>({ open: false, title: "", message: "", onConfirm: () => {} });

  const { data: blogs = [], isLoading } = trpc.blog.admin.listAll.useQuery();

  const publishMutation = trpc.blog.admin.publish.useMutation({
    onSuccess: () => {
      utils.blog.admin.listAll.invalidate();
      toast.success("Blog published successfully!");
    },
    onError: (e) => toast.error(e.message),
  });

  const unpublishMutation = trpc.blog.admin.unpublish.useMutation({
    onSuccess: () => {
      utils.blog.admin.listAll.invalidate();
      toast.success("Blog moved to drafts.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.blog.admin.delete.useMutation({
    onSuccess: () => {
      utils.blog.admin.listAll.invalidate();
      toast.success("Blog deleted.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDelete = (id: number, title: string) => {
    setConfirm({
      open: true,
      title: "Delete Blog Post",
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      onConfirm: () => {
        deleteMutation.mutate({ id });
        setConfirm(c => ({ ...c, open: false }));
      },
    });
  };

  const filtered = blogs.filter(b => {
    const matchesSearch = !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.author || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const publishedCount = blogs.filter(b => b.status === "published").length;
  const draftCount = blogs.filter(b => b.status === "draft").length;

  return (
    <AdminLayout
      title="Blog Management"
      subtitle={`${blogs.length} posts`}
      actions={
        <Link href="/admin/blogs/new">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#43A047] text-white text-[13px] font-medium rounded-lg hover:bg-[#388E3C] transition-colors">
            <Plus size={14} />
            New Blog
          </button>
        </Link>
      }
    >
      <div className="p-4 lg:p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">Total Posts</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{blogs.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">Published</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{publishedCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">Drafts</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{draftCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, category, author..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 bg-white"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Blog List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading blog posts...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <BookOpen size={32} className="mb-3 opacity-40" />
              <p className="text-[14px] font-medium">
                {search || filterStatus !== "all" ? "No posts match your filters" : "No blog posts yet"}
              </p>
              {!search && filterStatus === "all" && (
                <Link href="/admin/blogs/new">
                  <button className="mt-3 px-4 py-2 bg-[#43A047] text-white text-[13px] font-medium rounded-lg hover:bg-[#388E3C] transition-colors">
                    Write your first blog post
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-[1fr_120px_120px_100px_120px] gap-4 px-4 py-2.5 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                <span>Post</span>
                <span>Category</span>
                <span>Author</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>

              {filtered.map(blog => (
                <div key={blog.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  {/* Mobile layout */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate">{blog.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{blog.excerpt || "No excerpt"}</p>
                      </div>
                      <StatusBadge status={blog.status as BlogStatus} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      {blog.category && <span className="flex items-center gap-1"><Tag size={10} />{blog.category}</span>}
                      {blog.author && <span className="flex items-center gap-1"><User size={10} />{blog.author}</span>}
                      {blog.publishedAt && <span className="flex items-center gap-1"><Calendar size={10} />{new Date(blog.publishedAt).toLocaleDateString("en-IN")}</span>}
                    </div>
                    <BlogActions
                      blog={blog}
                      onPublish={() => publishMutation.mutate({ id: blog.id })}
                      onUnpublish={() => unpublishMutation.mutate({ id: blog.id })}
                      onDelete={() => handleDelete(blog.id, blog.title)}
                      isLoading={publishMutation.isPending || unpublishMutation.isPending || deleteMutation.isPending}
                    />
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden md:grid grid-cols-[1fr_120px_120px_100px_120px] gap-4 items-center">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{blog.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{blog.excerpt || "No excerpt"}</p>
                      {blog.publishedAt && (
                        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <Calendar size={9} />
                          {new Date(blog.publishedAt).toLocaleDateString("en-IN")}
                        </p>
                      )}
                    </div>
                    <div className="text-[12px] text-gray-600 truncate">
                      {blog.category ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[11px] font-medium">
                          <Tag size={9} />{blog.category}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <div className="text-[12px] text-gray-600 truncate">
                      {blog.author || <span className="text-gray-400">—</span>}
                    </div>
                    <div>
                      <StatusBadge status={blog.status as BlogStatus} />
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <BlogActions
                        blog={blog}
                        onPublish={() => publishMutation.mutate({ id: blog.id })}
                        onUnpublish={() => unpublishMutation.mutate({ id: blog.id })}
                        onDelete={() => handleDelete(blog.id, blog.title)}
                        isLoading={publishMutation.isPending || unpublishMutation.isPending || deleteMutation.isPending}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">{confirm.title}</h3>
            </div>
            <p className="text-[13px] text-gray-600 mb-5">{confirm.message}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirm(c => ({ ...c, open: false }))}
                className="px-4 py-2 text-[13px] font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirm.onConfirm}
                className="px-4 py-2 text-[13px] font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function StatusBadge({ status }: { status: BlogStatus }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[11px] font-semibold">
        <Globe size={9} /> Published
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[11px] font-semibold">
      <FileText size={9} /> Draft
    </span>
  );
}

function BlogActions({
  blog,
  onPublish,
  onUnpublish,
  onDelete,
  isLoading,
}: {
  blog: { id: number; status: string | null; slug: string };
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Link href={`/admin/blogs/edit/${blog.id}`}>
        <button
          title="Edit"
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Edit2 size={14} />
        </button>
      </Link>
      {blog.status === "published" ? (
        <button
          title="Unpublish"
          onClick={onUnpublish}
          disabled={isLoading}
          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <EyeOff size={14} />
        </button>
      ) : (
        <button
          title="Publish"
          onClick={onPublish}
          disabled={isLoading}
          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <Eye size={14} />
        </button>
      )}
      <a
        href={`/blogs/news/${blog.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        title="View on site"
        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
      >
        <Globe size={14} />
      </a>
      <button
        title="Delete"
        onClick={onDelete}
        disabled={isLoading}
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
