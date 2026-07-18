import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageCircle, Send, RefreshCw, Search, Phone, Clock, CheckCheck,
  Check, AlertCircle, Megaphone, Activity, Filter, ChevronLeft, Users,
  ShoppingBag, Truck, Package, RotateCcw, Bell, Loader2, History, BarChart3, Settings,
  CalendarDays, X
} from "lucide-react";
import WhatsAppTemplates from "./WhatsAppTemplates";
import WhatsAppCampaigns from "./WhatsAppCampaigns";
import AdminLayout from "@/components/admin/AdminLayout";

// ─── Types ────────────────────────────────────────────────────────────────────
type Conversation = {
  id: number;
  phone: string;
  customerName: string | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  status: string;
};

type WaMessage = {
  id: number;
  conversationId: number;
  phone: string;
  direction: string;
  messageType: string;
  content: string;
  mediaUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  metaMessageId: string | null;
  status: string;
  sentAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date: Date | null | string): string {
  if (!date) return "";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusIcon(status: string) {
  if (status === "read") return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
  if (status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
  if (status === "sent") return <Check className="w-3.5 h-3.5 text-gray-400" />;
  if (status === "failed") return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
  return null;
}

function msgTypeInfo(type: string) {
  const map: Record<string, { label: string; color: string }> = {
    order_confirmation: { label: "Order Confirmed", color: "bg-green-100 text-green-700" },
    order_shipped: { label: "Shipped", color: "bg-blue-100 text-blue-700" },
    order_delivered: { label: "Delivered", color: "bg-purple-100 text-purple-700" },
    abandoned_cart: { label: "Cart Recovery", color: "bg-orange-100 text-orange-700" },
    promotional: { label: "Campaign", color: "bg-pink-100 text-pink-700" },
    text: { label: "Text", color: "bg-gray-100 text-gray-700" },
  };
  return map[type] || { label: type, color: "bg-gray-100 text-gray-600" };
}

// ─── Live Chat Tab ─────────────────────────────────────────────────────────────
function LiveChatTab() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedPhone, setSelectedPhone] = useState<string>("");
  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], refetch: refetchConvos } = trpc.whatsapp.getConversations.useQuery(undefined, {
    refetchInterval: 10000,
  });

  const { data: messages = [], refetch: refetchMsgs } = trpc.whatsapp.getConversationMessages.useQuery(
    { conversationId: selectedId!, phone: selectedPhone || undefined },
    { enabled: !!selectedId, refetchInterval: 5000 }
  );

  const markRead = trpc.whatsapp.markConversationRead.useMutation();
  const sendReply = trpc.whatsapp.sendReply.useMutation({
    onSuccess: () => {
      setReplyText("");
      refetchMsgs();
      refetchConvos();
      toast.success("Message sent!");
    },
    onError: (err) => toast.error("Failed to send: " + err.message),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filtered = (conversations as Conversation[]).filter(c => {
    const matchSearch = !search || c.phone.includes(search) || (c.customerName || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || filter === "unread" ? (filter === "unread" ? c.unreadCount > 0 : true) : c.status === filter;
    return matchSearch && matchFilter;
  });

  const selected = (conversations as Conversation[]).find(c => c.id === selectedId);

  function openConversation(c: Conversation) {
    setSelectedId(c.id);
    setSelectedPhone(c.phone);
    if (c.unreadCount > 0) markRead.mutate({ conversationId: c.id });
  }

  function handleSend() {
    if (!replyText.trim() || !selectedId) return;
    sendReply.mutate({ conversationId: selectedId, phone: selectedPhone, message: replyText.trim() });
  }

  const totalUnread = (conversations as Conversation[]).reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] border rounded-xl overflow-hidden bg-white">
      {/* Conversation List */}
      <div className={`flex flex-col border-r ${selectedId ? "hidden md:flex" : "flex"} w-full md:w-80 flex-shrink-0`}>
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-green-600" /> Chats
              {totalUnread > 0 && <Badge className="bg-green-600 text-white text-xs px-1.5 py-0">{totalUnread}</Badge>}
            </span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => refetchConvos()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Search name or number..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chats</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2 p-4">
              <MessageCircle className="w-8 h-8 opacity-30" />
              <p>No conversations yet</p>
              <p className="text-xs text-center">When customers message you on WhatsApp, they'll appear here</p>
            </div>
          ) : (
            filtered.map((c: Conversation) => (
              <button
                key={c.id}
                onClick={() => openConversation(c)}
                className={`w-full text-left px-3 py-3 border-b hover:bg-gray-50 transition-colors ${selectedId === c.id ? "bg-green-50 border-l-2 border-l-green-600" : ""}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-700 font-semibold text-sm">
                    {(c.customerName || c.phone).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900 truncate">{c.customerName || c.phone}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    {c.customerName && <p className="text-xs text-gray-400">{c.phone}</p>}
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-500 truncate flex-1">{c.lastMessage || "..."}</p>
                      {c.unreadCount > 0 && (
                        <Badge className="bg-green-600 text-white text-xs px-1.5 py-0 ml-1 flex-shrink-0">{c.unreadCount}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      {selectedId ? (
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
            <Button size="icon" variant="ghost" className="h-8 w-8 md:hidden" onClick={() => setSelectedId(null)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm flex-shrink-0">
              {(selected?.customerName || selected?.phone || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{selected?.customerName || selected?.phone}</p>
              {selected?.customerName && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone}</p>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => refetchMsgs()} className="h-8 w-8 p-0">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2]">
            {((messages as unknown) as WaMessage[]).length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No messages yet</div>
            ) : (
              ((messages as unknown) as WaMessage[]).map((msg: WaMessage) => (
                <div key={msg.id} className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm ${
                    msg.direction === "outgoing" ? "bg-[#dcf8c6] rounded-tr-sm" : "bg-white rounded-tl-sm"
                  }`}>
                    {/* Media: Image */}
                    {msg.mediaUrl && (msg.messageType === "image" || msg.messageType === "sticker") && (
                      <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                        <img src={msg.mediaUrl} alt="" className="rounded-lg max-w-full max-h-52 mb-1.5 object-contain cursor-pointer hover:opacity-90" loading="lazy" />
                      </a>
                    )}
                    {/* Media: Video */}
                    {msg.mediaUrl && msg.messageType === "video" && (
                      <video src={msg.mediaUrl} controls className="rounded-lg max-w-full max-h-52 mb-1.5" />
                    )}
                    {/* Media: Audio */}
                    {msg.mediaUrl && msg.messageType === "audio" && (
                      <audio src={msg.mediaUrl} controls className="mb-1.5 max-w-full" />
                    )}
                    {/* Media: Document */}
                    {msg.mediaUrl && msg.messageType === "document" && (
                      <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-1.5 hover:bg-gray-100 transition-colors">
                        <span className="text-2xl">📄</span>
                        <span className="text-sm text-blue-600 font-medium truncate">{msg.content?.replace("📄 ", "") || "Document"}</span>
                      </a>
                    )}
                    {/* Fallback media (outgoing with URL but unknown type) */}
                    {msg.mediaUrl && !["image", "video", "audio", "document", "sticker"].includes(msg.messageType) && (
                      <img src={msg.mediaUrl} alt="" className="rounded-lg max-w-full max-h-48 mb-1.5 object-cover" />
                    )}
                    {/* Message content */}
                    {msg.messageType === "interactive" || msg.messageType === "button" ? (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded mr-1">Button</span>
                        {msg.content}
                      </p>
                    ) : msg.messageType === "image" && !msg.mediaUrl ? (
                      <p className="text-sm text-gray-500 italic">📷 Image (not available)</p>
                    ) : msg.messageType === "image" && msg.mediaUrl && msg.content && msg.content !== "📷 Image" ? (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                    ) : msg.messageType === "audio" && !msg.mediaUrl ? (
                      <p className="text-sm text-gray-500 italic">🎵 Voice/Audio message</p>
                    ) : msg.messageType === "video" && !msg.mediaUrl ? (
                      <p className="text-sm text-gray-500 italic">🎥 Video (not available)</p>
                    ) : msg.messageType === "video" && msg.mediaUrl && msg.content && msg.content !== "🎥 Video" ? (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                    ) : msg.messageType === "document" && !msg.mediaUrl ? (
                      <p className="text-sm text-gray-500 italic">📄 {msg.content}</p>
                    ) : msg.messageType === "sticker" && !msg.mediaUrl ? (
                      <p className="text-sm text-gray-500 italic">🎭 Sticker</p>
                    ) : msg.messageType === "unsupported" ? (
                      <p className="text-sm text-gray-400 italic">⚠️ Unsupported message</p>
                    ) : ["image", "video", "audio", "document", "sticker"].includes(msg.messageType) ? null : (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                    )}
                    {/* CTA Button */}
                    {msg.buttonUrl && (
                      <a
                        href={msg.buttonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 block text-center text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg py-1.5 px-3 hover:bg-blue-100 transition-colors"
                      >
                        {msg.buttonText || "Open Link"}
                      </a>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-[10px] text-gray-400">{timeAgo(msg.sentAt)}</span>
                      {msg.direction === "outgoing" && statusIcon(msg.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t bg-white flex gap-2 items-end">
            <Textarea
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!replyText.trim() || sendReply.isPending}
              className="bg-green-600 hover:bg-green-700 h-10 w-10 p-0 flex-shrink-0"
            >
              {sendReply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-400 flex-col gap-3">
          <MessageCircle className="w-12 h-12 opacity-20" />
          <p className="text-sm">Select a conversation to start chatting</p>
        </div>
      )}
    </div>
  );
}

// ─── Transactional Tab ─────────────────────────────────────────────────────────
function TransactionalTab() {
  const templates = [
    {
      key: "order_confirmation",
      title: "Order Confirmed",
      icon: <ShoppingBag className="w-5 h-5 text-green-600" />,
      description: "Sent automatically when customer places an order",
      preview: "Hi {name}! Your Nutriwow order #{orderId} has been placed! Total: ₹{total}. Payment: {method}. Delivery in 3-5 business days.",
      trigger: "Auto — on order placed",
    },
    {
      key: "order_shipped",
      title: "Order Shipped",
      icon: <Truck className="w-5 h-5 text-blue-600" />,
      description: "Sent when admin marks order as shipped",
      preview: "Great news {name}! Your Nutriwow order #{orderId} has been shipped! AWB: {awb}. Track your order at: {trackingUrl}",
      trigger: "Auto — on order shipped",
    },
    {
      key: "order_delivered",
      title: "Order Delivered",
      icon: <Package className="w-5 h-5 text-purple-600" />,
      description: "Sent when order is marked as delivered",
      preview: "Hi {name}! Your Nutriwow order #{orderId} has been delivered! We hope you love your products.",
      trigger: "Auto — on order delivered",
    },
    {
      key: "abandoned_cart",
      title: "Cart Recovery",
      icon: <RotateCcw className="w-5 h-5 text-orange-600" />,
      description: "Sent to customers who left items in cart for 45+ minutes",
      preview: "Hi {name}! You left some items in your Nutriwow cart. Total: ₹{total}. Complete your order: www.nutriwow.in",
      trigger: "Auto — 45 min after cart abandoned",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
        <strong>All transactional messages are automated.</strong> They are sent automatically based on order events. No manual action needed.
      </div>
      <div className="grid gap-4">
        {templates.map(t => (
          <Card key={t.key} className="border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{t.title}</h3>
                    <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">
                      <Activity className="w-2.5 h-2.5 mr-1" /> {t.trigger}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  <div className="mt-2 bg-[#efeae2] rounded-xl p-3">
                    <p className="text-xs text-gray-700 font-mono leading-relaxed">{t.preview}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Campaigns Tab (replaced by WhatsAppCampaigns component) ─────────────────

// ─── All Logs Tab ──────────────────────────────────────────────────────────────
function AllLogsTab() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const utils = trpc.useUtils();
  const { data: result = { logs: [], stats: { sent: 0, delivered: 0, read: 0, failed: 0 } }, refetch } = trpc.whatsapp.getLogs.useQuery({ limit: 500, startDate: startDate || undefined, endDate: endDate || undefined });
  
  const logs = (result as any).logs || (Array.isArray(result) ? result : []);
  const stats = (result as any).stats || { sent: 0, delivered: 0, read: 0, failed: 0 };

  const filtered = (logs as any[]).filter(l => {
    const matchType = typeFilter === "all" || l.messageType === typeFilter;
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchSearch = !search || l.phone?.includes(search) || (l.customerName || "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const types = ["all", "order_confirmation", "order_shipped", "order_delivered", "abandoned_cart", "promotional", "text"];
  const statuses = ["all", "sent", "delivered", "read", "failed"];

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { all: "All Status", sent: "Sent", delivered: "Delivered", read: "Read", failed: "Failed" };
    return map[s] || s;
  };

  const downloadCSV = async () => {
    // Export ALL matching logs, not just the 500 shown in the table.
    let exportLogs: any[] = logs;
    try {
      const full = await utils.whatsapp.getLogs.fetch({ limit: 100000, startDate: startDate || undefined, endDate: endDate || undefined });
      exportLogs = (full as any).logs || logs;
    } catch { /* fall back to the loaded page */ }
    const rowsData = exportLogs.filter(l => {
      const matchType = typeFilter === "all" || l.messageType === typeFilter;
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      const matchSearch = !search || l.phone?.includes(search) || (l.customerName || "").toLowerCase().includes(search.toLowerCase());
      return matchType && matchStatus && matchSearch;
    });
    if (rowsData.length === 0) { toast.error("No data to download"); return; }
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = ["Name", "Phone", "Type", "Message", "Status", "Error", "Time"];
    const rows = rowsData.map((l: any) => [
      l.customerName || "",
      l.phone || "",
      l.messageType || "",
      (l.messageContent || l.message || "").replace(/\n/g, " "),
      l.status || "",
      l.errorMessage || "",
      l.sentAt ? new Date(l.sentAt).toLocaleString("en-IN") : "",
    ].map(esc).join(","));
    const csv = [headers.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filterLabel = statusFilter !== "all" ? `_${statusFilter}` : "";
    a.href = url;
    a.download = `whatsapp_logs${filterLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${rowsData.length} records`);
  };

  // Stats from backend (all data, not just filtered)
  const sentCount = stats.sent;
  const deliveredCount = stats.delivered;
  const readCount = stats.read;
  const failedCount = stats.failed;

  const clearDates = () => { setStartDate(""); setEndDate(""); };
  const hasDateFilter = startDate || endDate;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-green-50 rounded-lg p-3 text-center cursor-pointer hover:bg-green-100 transition" onClick={() => setStatusFilter("sent")}>
          <p className="text-lg font-bold text-green-700">{sentCount}</p>
          <p className="text-xs text-green-600">Sent</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center cursor-pointer hover:bg-blue-100 transition" onClick={() => setStatusFilter("delivered")}>
          <p className="text-lg font-bold text-blue-700">{deliveredCount}</p>
          <p className="text-xs text-blue-600">Delivered</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center cursor-pointer hover:bg-purple-100 transition" onClick={() => setStatusFilter("read")}>
          <p className="text-lg font-bold text-purple-700">{readCount}</p>
          <p className="text-xs text-purple-600">Read</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center cursor-pointer hover:bg-red-100 transition" onClick={() => setStatusFilter("failed")}>
          <p className="text-lg font-bold text-red-700">{failedCount}</p>
          <p className="text-xs text-red-600">Failed</p>
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-lg p-2.5">
        <CalendarDays className="w-4 h-4 text-gray-500" />
        <span className="text-xs font-medium text-gray-600">Date Range:</span>
        <Input type="date" className="h-8 w-[140px] text-xs" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <span className="text-xs text-gray-400">to</span>
        <Input type="date" className="h-8 w-[140px] text-xs" value={endDate} onChange={e => setEndDate(e.target.value)} />
        {hasDateFilter && (
          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={clearDates}>
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <Input placeholder="Search by phone or name..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-9">
            <Filter className="w-3.5 h-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map(t => <SelectItem key={t} value={t}>{t === "all" ? "All Types" : msgTypeInfo(t).label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-9" onClick={downloadCSV}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" /></svg>
          Download CSV
        </Button>
        <Button size="sm" variant="outline" className="h-9" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <p className="text-xs text-gray-500">
        Showing {filtered.length}{logs.length >= 500 ? " (table capped at 500 most recent)" : ""}
        {" · "}{(sentCount + deliveredCount + readCount + failedCount).toLocaleString("en-IN")} total
        {statusFilter !== "all" && ` (${statusLabel(statusFilter)})`} {typeFilter !== "all" && `• ${msgTypeInfo(typeFilter).label}`} {hasDateFilter && `• ${startDate || "..."} to ${endDate || "..."}`}
        {" — "}<span className="text-gray-400">Download CSV exports all</span>
      </p>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Customer</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Type</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs hidden md:table-cell">Message</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No messages found</td></tr>
            ) : (
              filtered.map((log: any) => {
                const info = msgTypeInfo(log.messageType);
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800 text-xs">{log.customerName || log.phone}</p>
                      {log.customerName && <p className="text-xs text-gray-400">{log.phone}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
                        {info.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <p className="text-xs text-gray-600 max-w-xs truncate">{log.messageContent || log.message || "—"}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold ${
                        log.status === "delivered" ? "text-green-600" :
                        log.status === "sent" ? "text-yellow-600" :
                        log.status === "read" ? "text-blue-600" :
                        log.status === "failed" ? "text-red-500" : "text-gray-500"
                      }`}>{log.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{timeAgo(log.sentAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const VALID_TABS = ["chats", "transactional", "campaigns", "logs", "templates"];

export default function AdminWhatsApp() {
  const { data: conversations = [] } = trpc.whatsapp.getConversations.useQuery(undefined, { refetchInterval: 15000 });
  const totalUnread = (conversations as Conversation[]).reduce((s, c) => s + (c.unreadCount || 0), 0);

  // Persist active tab in the URL hash so a refresh keeps you on the same tab
  // (e.g. All Logs) instead of snapping back to Live Chats.
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace(/^#/, "");
    return VALID_TABS.includes(hash) ? hash : "chats";
  });

  function handleTabChange(value: string) {
    setActiveTab(value);
    window.history.replaceState(null, "", `#${value}`);
  }

  return (
    <AdminLayout title="WhatsApp" subtitle="Manage conversations, transactional messages, and campaigns">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="chats" className="flex items-center gap-1.5 text-sm">
            <MessageCircle className="w-3.5 h-3.5" />
            Live Chats
            {totalUnread > 0 && <Badge className="bg-green-600 text-white text-xs px-1.5 py-0 ml-0.5">{totalUnread}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="transactional" className="flex items-center gap-1.5 text-sm">
            <Activity className="w-3.5 h-3.5" /> Transactional
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-1.5 text-sm">
            <Megaphone className="w-3.5 h-3.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5 text-sm">
            <BarChart3 className="w-3.5 h-3.5" /> All Logs
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-sm">
            <Settings className="w-3.5 h-3.5" /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="mt-4">
          <LiveChatTab />
        </TabsContent>
        <TabsContent value="transactional" className="mt-4">
          <TransactionalTab />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4">
          <WhatsAppCampaigns />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <AllLogsTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <WhatsAppTemplates />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
