/*
 * Nutriwow Admin - Blog Editor
 * Features: Rich text editor (textarea + toolbar), header image (upload/AI generate),
 * AI write, AI suggest topics, internal link inserter, SEO fields
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import {
  ArrowLeft, Save, Globe, FileText, Image, Wand2, Lightbulb, Link2,
  Upload, Loader2, X, Plus, Eye, EyeOff, ChevronDown, Bold, Italic,
  List, Heading2, Heading3, Quote, Code, AlignLeft, ExternalLink,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { sanitizeBlogHtml } from "@/lib/sanitize";
import { products, CATEGORIES } from "@/lib/products";

// ─── Internal Link Options ────────────────────────────────────────────────────
const INTERNAL_LINKS = [
  { label: "🏠 Home", url: "/" },
  { label: "🛒 Shop All", url: "/products" },
  ...CATEGORIES.map(cat => ({ label: `📦 ${cat}`, url: `/collections/${cat.toLowerCase().replace(/\s+/g, "-")}` })),
  ...products.slice(0, 30).map(p => ({ label: `🥜 ${p.name.slice(0, 50)}${p.name.length > 50 ? "…" : ""}`, url: `/products/${p.handle}` })),
];

// ─── Blog Categories ──────────────────────────────────────────────────────────
const BLOG_CATEGORIES = ["Health & Nutrition", "Recipes", "Lifestyle", "Tips & Tricks", "Product Spotlight", ...CATEGORIES];

interface BlogForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string;
  author: string;
  seoTitle: string;
  seoDescription: string;
  status: "draft" | "published";
}

const defaultForm: BlogForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  category: "",
  tags: "",
  author: "Nutriwow Team",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
};

export default function BlogEditor() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const isNew = !params.id || params.id === "new";
  const blogId = isNew ? null : parseInt(params.id!, 10);

  const utils = trpc.useUtils();
  const [form, setForm] = useState<BlogForm>(defaultForm);
  const [activeTab, setActiveTab] = useState<"content" | "seo" | "preview">("content");
  const [showLinkInserter, setShowLinkInserter] = useState(false);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<Array<{ title: string; category: string; keywords: string }>>([]);
  const [linkSearch, setLinkSearch] = useState("");
  const [aiWriteKeywords, setAiWriteKeywords] = useState("");
  const [aiWriteTitle, setAiWriteTitle] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // ─── Load existing blog ────────────────────────────────────────────────────
  const { data: existingBlog, isLoading: loadingBlog } = trpc.blog.admin.getById.useQuery(
    { id: blogId! },
    { enabled: !!blogId }
  );

  useEffect(() => {
    if (existingBlog) {
      setForm({
        title: existingBlog.title || "",
        slug: existingBlog.slug || "",
        excerpt: existingBlog.excerpt || "",
        content: existingBlog.content || "",
        coverImage: existingBlog.coverImage ?? "",
        category: existingBlog.category || "",
        tags: existingBlog.tags || "",
        author: existingBlog.author || "Nutriwow Team",
        seoTitle: existingBlog.seoTitle || "",
        seoDescription: existingBlog.seoDescription || "",
        status: (existingBlog.status as "draft" | "published") || "draft",
      });
    }
  }, [existingBlog]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = trpc.blog.admin.create.useMutation({
    onSuccess: (data) => {
      toast.success("Blog post created!");
      setIsDirty(false);
      utils.blog.admin.listAll.invalidate();
      navigate(`/admin/blogs/edit/${data?.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.blog.admin.update.useMutation({
    onSuccess: () => {
      toast.success("Blog post saved!");
      setIsDirty(false);
      utils.blog.admin.listAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const publishMutation = trpc.blog.admin.publish.useMutation({
    onSuccess: () => {
      toast.success("Blog published!");
      setIsDirty(false);
      utils.blog.admin.listAll.invalidate();
      setForm(f => ({ ...f, status: "published" }));
    },
    onError: (e) => toast.error(e.message),
  });

  const unpublishMutation = trpc.blog.admin.unpublish.useMutation({
    onSuccess: () => {
      toast.success("Blog moved to drafts.");
      utils.blog.admin.listAll.invalidate();
      setForm(f => ({ ...f, status: "draft" }));
    },
    onError: (e) => toast.error(e.message),
  });

  const [isUploading, setIsUploading] = useState(false);
  const getUploadTokenMutation = trpc.blog.admin.getUploadToken.useMutation();

  const aiWriteMutation = trpc.blog.admin.aiWrite.useMutation({
    onSuccess: (data) => {
      setForm(f => ({ ...f, content: data.content }));
      setShowAiPanel(false);
      setIsDirty(true);
      toast.success("AI content generated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const aiSuggestMutation = trpc.blog.admin.aiSuggestTopics.useMutation({
    onSuccess: (data) => {
      setSuggestedTopics(data.topics);
      setShowTopicSuggestions(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const aiImageMutation = trpc.blog.admin.aiGenerateImage.useMutation({
    onSuccess: (data) => {
      setForm(f => ({ ...f, coverImage: data.url ?? f.coverImage }));
      setIsDirty(true);
      toast.success("AI image generated!");
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const updateField = (field: keyof BlogForm, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setIsDirty(true);
    if (field === "title" && isNew) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setForm(f => ({ ...f, title: value, slug }));
    }
  };

  const handleSave = () => {
    // If title field is empty but AI Write topic was filled, use that as title
    let saveForm = form;
    if (!form.title.trim() && aiWriteTitle.trim()) {
      const slug = aiWriteTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      saveForm = { ...form, title: aiWriteTitle.trim(), slug: form.slug || slug };
      setForm(saveForm);
    }
    if (!saveForm.title.trim()) {
      toast.error("Title is required — please fill in the blog title at the top");
      return;
    }
    if (isNew) {
      createMutation.mutate(saveForm);
    } else {
      updateMutation.mutate({ id: blogId!, ...saveForm });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image must be under 20MB");
      return;
    }
    setIsUploading(true);
    try {
      const { token, pathname } = await getUploadTokenMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });
      const { put } = await import("@vercel/blob/client");
      const blob = await put(pathname, file, { access: "public", token });
      setForm(f => ({ ...f, coverImage: blob.url }));
      setIsDirty(true);
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err?.message || "Image upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const insertTextAtCursor = (text: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = form.content.slice(0, start) + text + form.content.slice(end);
    setForm(f => ({ ...f, content: newContent }));
    setIsDirty(true);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const insertFormat = (tag: string, defaultText = "text") => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.content.slice(start, end) || defaultText;
    let formatted = "";
    switch (tag) {
      case "h2": formatted = `<h2>${selected}</h2>`; break;
      case "h3": formatted = `<h3>${selected}</h3>`; break;
      case "b": formatted = `<strong>${selected}</strong>`; break;
      case "i": formatted = `<em>${selected}</em>`; break;
      case "ul": formatted = `<ul>\n  <li>${selected}</li>\n  <li>Item 2</li>\n</ul>`; break;
      case "blockquote": formatted = `<blockquote>${selected}</blockquote>`; break;
      case "code": formatted = `<code>${selected}</code>`; break;
      case "p": formatted = `<p>${selected}</p>`; break;
      default: formatted = selected;
    }
    insertTextAtCursor(formatted);
  };

  const insertInternalLink = (url: string, label: string) => {
    const linkHtml = `<a href="${url}" title="${label}">${label}</a>`;
    insertTextAtCursor(linkHtml);
    setShowLinkInserter(false);
    setLinkSearch("");
  };

  const filteredLinks = INTERNAL_LINKS.filter(l =>
    !linkSearch || l.label.toLowerCase().includes(linkSearch.toLowerCase()) || l.url.toLowerCase().includes(linkSearch.toLowerCase())
  ).slice(0, 20);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isPublishing = publishMutation.isPending || unpublishMutation.isPending;

  if (!isNew && loadingBlog) {
    return (
      <AdminLayout title="Blog Editor">
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading blog post...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isNew ? "New Blog Post" : "Edit Blog Post"}
      subtitle={form.status === "published" ? "Published" : "Draft"}
      actions={
        <div className="flex items-center gap-2">
          {!isNew && form.status === "published" ? (
            <button
              onClick={() => unpublishMutation.mutate({ id: blogId! })}
              disabled={isPublishing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {isPublishing ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />}
              Unpublish
            </button>
          ) : !isNew ? (
            <button
              onClick={() => {
                if (isDirty) {
                  updateMutation.mutate({ id: blogId!, ...form }, {
                    onSuccess: () => publishMutation.mutate({ id: blogId! }),
                  });
                } else {
                  publishMutation.mutate({ id: blogId! });
                }
              }}
              disabled={isPublishing || isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isPublishing ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
              Publish
            </button>
          ) : null}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#43A047] text-white text-[13px] font-medium rounded-lg hover:bg-[#388E3C] transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      }
    >
      <div className="p-4 lg:p-6">
        {/* Back */}
        <button
          onClick={() => navigate("/admin/blogs")}
          className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Blogs
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
          {/* Main Editor */}
          <div className="space-y-4">
            {/* Title */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <input
                type="text"
                name="blog-title"
                autoComplete="off"
                placeholder="Blog post title..."
                value={form.title}
                onChange={e => updateField("title", e.target.value)}
                onInput={e => updateField("title", (e.target as HTMLInputElement).value)}
                className="w-full text-xl font-bold text-gray-900 placeholder-gray-300 border-none outline-none resize-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-gray-400">Slug:</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => updateField("slug", e.target.value)}
                  className="flex-1 text-[12px] text-gray-600 border-none outline-none bg-gray-50 rounded px-2 py-0.5 font-mono"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-2">Excerpt</label>
              <textarea
                placeholder="Short description shown in blog listing..."
                value={form.excerpt}
                onChange={e => updateField("excerpt", e.target.value)}
                rows={2}
                className="w-full text-[13px] text-gray-700 placeholder-gray-300 border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]"
              />
            </div>

            {/* Content Editor */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-200">
                {(["content", "seo", "preview"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-[13px] font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "text-[#43A047] border-b-2 border-[#43A047] bg-green-50/50"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab === "content" ? "Content" : tab === "seo" ? "SEO" : "Preview"}
                  </button>
                ))}
              </div>

              {activeTab === "content" && (
                <div>
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-gray-50">
                    <ToolbarBtn icon={<Heading2 size={13} />} title="H2" onClick={() => insertFormat("h2", "Heading 2")} />
                    <ToolbarBtn icon={<Heading3 size={13} />} title="H3" onClick={() => insertFormat("h3", "Heading 3")} />
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <ToolbarBtn icon={<Bold size={13} />} title="Bold" onClick={() => insertFormat("b")} />
                    <ToolbarBtn icon={<Italic size={13} />} title="Italic" onClick={() => insertFormat("i")} />
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <ToolbarBtn icon={<List size={13} />} title="List" onClick={() => insertFormat("ul", "List item")} />
                    <ToolbarBtn icon={<Quote size={13} />} title="Quote" onClick={() => insertFormat("blockquote")} />
                    <ToolbarBtn icon={<Code size={13} />} title="Code" onClick={() => insertFormat("code")} />
                    <ToolbarBtn icon={<AlignLeft size={13} />} title="Paragraph" onClick={() => insertFormat("p")} />
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <button
                      onClick={() => setShowLinkInserter(l => !l)}
                      className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                        showLinkInserter ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Link2 size={12} />
                      Internal Link
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => setShowAiPanel(p => !p)}
                        className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                          showAiPanel ? "bg-purple-100 text-purple-700" : "text-purple-600 hover:bg-purple-50"
                        }`}
                      >
                        <Wand2 size={12} />
                        AI Write
                      </button>
                    </div>
                  </div>

                  {/* AI Write Panel */}
                  {showAiPanel && (
                    <div className="border-b border-gray-100 bg-purple-50/50 p-3 space-y-2">
                      <p className="text-[12px] font-semibold text-purple-700">AI Blog Writer</p>
                      <input
                        type="text"
                        placeholder="Blog topic / title (e.g. Soya Chaap Benefits)"
                        value={aiWriteTitle}
                        onChange={e => setAiWriteTitle(e.target.value)}
                        className="w-full text-[12px] border border-purple-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white font-medium"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Keywords (optional, e.g. health benefits, protein)"
                          value={aiWriteKeywords}
                          onChange={e => setAiWriteKeywords(e.target.value)}
                          className="flex-1 text-[12px] border border-purple-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                        />
                        <button
                          onClick={() => {
                            const topic = aiWriteTitle.trim() || form.title.trim() || "Healthy Snacks";
                            aiWriteMutation.mutate({ title: topic, keywords: aiWriteKeywords });
                          }}
                          disabled={aiWriteMutation.isPending || (!aiWriteTitle.trim() && !form.title.trim())}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[12px] font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {aiWriteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                          {aiWriteMutation.isPending ? "Writing..." : "Generate"}
                        </button>
                      </div>
                      {!aiWriteTitle.trim() && form.title.trim() && (
                        <p className="text-[11px] text-purple-500">Using blog title: "{form.title}"</p>
                      )}
                      {!aiWriteTitle.trim() && !form.title.trim() && (
                        <p className="text-[11px] text-red-400">Please enter a topic above to generate content</p>
                      )}
                    </div>
                  )}

                  {/* Internal Link Inserter */}
                  {showLinkInserter && (
                    <div className="border-b border-gray-100 bg-blue-50/50 p-3">
                      <p className="text-[12px] font-semibold text-blue-700 mb-2">Insert Internal Link</p>
                      <input
                        type="text"
                        placeholder="Search products, categories..."
                        value={linkSearch}
                        onChange={e => setLinkSearch(e.target.value)}
                        className="w-full text-[12px] border border-blue-200 rounded-lg px-2.5 py-1.5 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                        autoFocus
                      />
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {filteredLinks.map(link => (
                          <button
                            key={link.url}
                            onClick={() => insertInternalLink(link.url, link.label.replace(/^[^\s]+\s/, ""))}
                            className="w-full text-left flex items-center justify-between px-2.5 py-1.5 text-[12px] text-gray-700 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <span className="truncate">{link.label}</span>
                            <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0 font-mono">{link.url}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Textarea */}
                  <textarea
                    ref={contentRef}
                    placeholder="Write your blog content here (HTML supported)...&#10;&#10;Example:&#10;<h2>Why Almonds Are Good For You</h2>&#10;<p>Almonds are packed with nutrients...</p>"
                    value={form.content}
                    onChange={e => updateField("content", e.target.value)}
                    rows={24}
                    className="w-full p-4 text-[13px] text-gray-700 font-mono leading-relaxed border-none outline-none resize-none"
                  />
                </div>
              )}

              {activeTab === "seo" && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">SEO Title</label>
                    <input
                      type="text"
                      placeholder="SEO title (defaults to post title if empty)"
                      value={form.seoTitle}
                      onChange={e => updateField("seoTitle", e.target.value)}
                      maxLength={70}
                      className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{form.seoTitle.length}/70 characters</p>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">Meta Description</label>
                    <textarea
                      placeholder="Meta description for search engines (150-160 chars recommended)"
                      value={form.seoDescription}
                      onChange={e => updateField("seoDescription", e.target.value)}
                      maxLength={160}
                      rows={3}
                      className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047]"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">{form.seoDescription.length}/160 characters</p>
                  </div>
                  {/* Google Preview */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Google Preview</p>
                    <div className="space-y-0.5">
                      <p className="text-[12px] text-gray-500">www.nutriwow.in › blog › {form.slug || "your-post-slug"}</p>
                      <p className="text-[16px] text-blue-700 font-medium leading-snug">
                        {form.seoTitle || form.title || "Your Blog Title"}
                      </p>
                      <p className="text-[13px] text-gray-600 leading-relaxed">
                        {form.seoDescription || form.excerpt || "Your meta description will appear here. Write a compelling 150-160 character description."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "preview" && (
                <div className="p-6">
                  {form.coverImage && (
                    <img src={form.coverImage} alt={form.title} className="w-full h-48 object-cover rounded-xl mb-4" />
                  )}
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.title || "Untitled"}</h1>
                  {form.excerpt && <p className="text-gray-500 text-[14px] mb-4 italic">{form.excerpt}</p>}
                  <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(form.content) || "<p class='text-gray-400'>No content yet...</p>" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Cover Image */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-3">Cover Image</label>
              {form.coverImage ? (
                <div className="relative">
                  <img src={form.coverImage} alt="Cover" className="w-full h-40 object-cover rounded-lg" />
                  <button
                    onClick={() => { setForm(f => ({ ...f, coverImage: "" })); setIsDirty(true); }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                  <Image size={24} className="opacity-40" />
                </div>
              )}
              <div className="mt-3 space-y-2">
                <label className={`flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg transition-colors ${isUploading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-100 cursor-pointer"}`}>
                  {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  {isUploading ? "Uploading..." : "Upload Image"}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                </label>
                <button
                  onClick={() => {
                    const topic = aiWriteTitle.trim() || form.title.trim() || "healthy food";
                    aiImageMutation.mutate({ prompt: `Blog cover image for the topic: "${topic}". High quality food photography, professional lighting, Indian aesthetic, vibrant colors, no text overlay.` });
                  }}
                  disabled={aiImageMutation.isPending}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  {aiImageMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                  {aiImageMutation.isPending ? "Generating..." : "AI Generate Image"}
                </button>
              </div>
            </div>

            {/* Post Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">Post Details</label>

              <div>
                <label className="text-[12px] text-gray-600 block mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => updateField("category", e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 bg-white"
                >
                  <option value="">Select category...</option>
                  {BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[12px] text-gray-600 block mb-1">Author</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={e => updateField("author", e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#43A047]/30"
                />
              </div>

              <div>
                <label className="text-[12px] text-gray-600 block mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="almonds, health, nutrition"
                  value={form.tags}
                  onChange={e => updateField("tags", e.target.value)}
                  className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#43A047]/30"
                />
              </div>

              <div>
                <label className="text-[12px] text-gray-600 block mb-1">Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateField("status", "draft")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${
                      form.status === "draft"
                        ? "bg-amber-50 text-amber-700 border-amber-300"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <FileText size={12} /> Draft
                  </button>
                  <button
                    onClick={() => updateField("status", "published")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[12px] font-medium rounded-lg border transition-colors ${
                      form.status === "published"
                        ? "bg-green-50 text-green-700 border-green-300"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Globe size={12} /> Published
                  </button>
                </div>
              </div>
            </div>

            {/* AI Topic Suggestions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-3">AI Topic Ideas</label>
              <button
                onClick={() => aiSuggestMutation.mutate({ category: form.category, count: 10 })}
                disabled={aiSuggestMutation.isPending}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {aiSuggestMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Lightbulb size={13} />}
                {aiSuggestMutation.isPending ? "Generating ideas..." : "Suggest Blog Topics"}
              </button>

              {showTopicSuggestions && suggestedTopics.length > 0 && (
                <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
                  {suggestedTopics.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => {
      setForm(f => {
          const slug = topic.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
          return { ...f, title: topic.title, slug, category: topic.category || f.category, tags: topic.keywords };
        });
                        setIsDirty(true);
                        setShowTopicSuggestions(false);
                        toast.success("Topic applied!");
                      }}
                      className="w-full text-left px-2.5 py-2 text-[12px] text-gray-700 bg-gray-50 hover:bg-amber-50 hover:text-amber-800 rounded-lg transition-colors border border-transparent hover:border-amber-200"
                    >
                      <p className="font-medium leading-snug">{topic.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{topic.category} · {topic.keywords}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {!isNew && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-3">Quick Actions</label>
                <div className="space-y-2">
                  <a
                    href={`/blogs/news/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink size={13} />
                    View on Site
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function ToolbarBtn({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors"
    >
      {icon}
    </button>
  );
}
