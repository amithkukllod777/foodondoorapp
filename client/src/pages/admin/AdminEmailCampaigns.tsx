/*
 * Admin → Email Campaigns
 * Create email campaigns, design them with AI (Claude), preview, test-send,
 * and send to a chosen audience. Sending uses the store's Brevo SMTP.
 */
import { useState, useEffect, useRef } from "react";
import {
  Mail, Sparkles, Send, Trash2, Plus, Eye, Loader2, Users, ShoppingBag,
  AlertCircle, CheckCircle2, ArrowLeft, KeyRound, BarChart3, MousePointerClick, MailOpen, X,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";

type Audience = "all" | "buyers" | "subscribers";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  html: string;
  audience: Audience;
  status: "draft" | "queued" | "sending" | "sent";
  recipientCount: number;
  sentCount: number;
  createdAt: string;
  sentAt: string | null;
}

const BTN = "px-4 py-2 text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2";

export default function AdminEmailCampaigns() {
  const utils = trpc.useUtils();
  const { data: info } = trpc.emailCampaigns.info.useQuery();
  const { data: campaigns = [], isLoading } = trpc.emailCampaigns.list.useQuery();
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);
  const [showSubs, setShowSubs] = useState(false);
  const [showTxn, setShowTxn] = useState(false);
  const { data: subscribers = [], isLoading: subsLoading } = trpc.emailCampaigns.subscribers.useQuery(undefined, { enabled: showSubs });

  const del = trpc.emailCampaigns.delete.useMutation({
    onSuccess: () => { utils.emailCampaigns.list.invalidate(); toast.success("Campaign deleted"); },
  });

  const processBatch = trpc.emailCampaigns.processBatch.useMutation();
  const pollingRef = useRef(false);
  const hasPending = (campaigns as Campaign[]).some(c => c.status === "queued" || c.status === "sending");

  useEffect(() => {
    if (!hasPending || pollingRef.current) return;
    pollingRef.current = true;
    const poll = async () => {
      while (pollingRef.current) {
        try {
          const res = await processBatch.mutateAsync();
          utils.emailCampaigns.list.invalidate();
          if (res.done) { pollingRef.current = false; break; }
        } catch { pollingRef.current = false; break; }
        await new Promise(r => setTimeout(r, 3000));
      }
    };
    poll();
    return () => { pollingRef.current = false; };
  }, [hasPending]);

  if (editing || creating) {
    return (
      <CampaignEditor
        initial={editing}
        info={info}
        onBack={() => { setEditing(null); setCreating(false); utils.emailCampaigns.list.invalidate(); }}
      />
    );
  }

  return (
    <AdminLayout title="Email Campaigns" subtitle="Design & send marketing emails">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto">
        <AiKeyCard configured={!!info?.aiConfigured} keySource={info?.keySource} />
        <ResendCard configured={!!info?.resendConfigured} from={info?.resendFrom} />


        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-[13px] text-gray-500 flex-wrap">
            <Users size={15} className="text-[#43A047]" /> {info?.audiences.all ?? "—"} customers
            <span className="mx-1">·</span>
            <ShoppingBag size={15} className="text-[#43A047]" /> {info?.audiences.buyers ?? "—"} buyers
            <span className="mx-1">·</span>
            <Mail size={15} className="text-[#43A047]" /> {info?.audiences.subscribers ?? "—"} subscribers
          </div>
          <button onClick={() => setCreating(true)} className={`${BTN} bg-[#43A047] text-white hover:bg-[#388E3C]`}>
            <Plus size={15} /> New Campaign
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-300" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Mail size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-gray-600">No campaigns yet</p>
            <p className="text-[12px] text-gray-400">Create your first email campaign to reach your customers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(campaigns as Campaign[]).map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-gray-900 truncate">{c.name || "(untitled)"}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-[12px] text-gray-500 truncate">{c.subject}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Audience: {c.audience === "buyers" ? "Buyers" : c.audience === "subscribers" ? "Newsletter subscribers" : "All customers"}
                      {(c.status === "sent" || c.status === "sending") && ` · Sent to ${c.sentCount}/${c.recipientCount}`}
                      {c.status === "queued" && ` · Queued (${c.recipientCount} recipients)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.status === "sent" && (
                      <button onClick={() => setViewingLogs(c.id)} className="px-3 py-1.5 text-[12px] font-semibold text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 flex items-center gap-1">
                        <BarChart3 size={13} /> Logs
                      </button>
                    )}
                    <button onClick={() => setEditing(c)} className="px-3 py-1.5 text-[12px] font-semibold text-[#43A047] border border-[#43A047] rounded-lg hover:bg-green-50">
                      {c.status === "sent" ? "View" : "Edit"}
                    </button>
                    <button onClick={() => { if (confirm("Delete this campaign?")) del.mutate({ id: c.id }); }} className="text-gray-300 hover:text-red-500 p-1.5">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {c.status === "sent" && <CampaignStatsBar campaignId={c.id} />}
              </div>
            ))}
          </div>
        )}
        {/* Transactional email logs */}
        <div className="mt-6">
          <button onClick={() => setShowTxn(!showTxn)} className="flex items-center gap-2 text-[13px] font-semibold text-blue-600 hover:underline mb-3">
            <Send size={15} /> {showTxn ? "Hide" : "View"} Transactional Email Logs
          </button>
          {showTxn && <TransactionalLogsTable />}
        </div>

        {/* Subscribers section */}
        <div className="mt-6">
          <button onClick={() => setShowSubs(!showSubs)} className="flex items-center gap-2 text-[13px] font-semibold text-[#43A047] hover:underline mb-3">
            <Mail size={15} /> {showSubs ? "Hide" : "View"} Newsletter Subscribers ({info?.audiences.subscribers ?? "—"})
          </button>
          {showSubs && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {subsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" /></div>
              ) : subscribers.length === 0 ? (
                <p className="text-center py-8 text-[13px] text-gray-400">No email subscribers yet.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-[11px] font-semibold text-gray-500">#</th>
                        <th className="px-4 py-2 text-[11px] font-semibold text-gray-500">Email</th>
                        <th className="px-4 py-2 text-[11px] font-semibold text-gray-500">Name</th>
                        <th className="px-4 py-2 text-[11px] font-semibold text-gray-500">Subscribed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(subscribers as any[]).map((s, i) => (
                        <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 text-[12px] text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2 text-[12px] text-gray-800">{s.email}</td>
                          <td className="px-4 py-2 text-[12px] text-gray-600">{s.name || "—"}</td>
                          <td className="px-4 py-2 text-[11px] text-gray-400">{s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {viewingLogs && <CampaignLogsDrawer campaignId={viewingLogs} onClose={() => setViewingLogs(null)} />}
    </AdminLayout>
  );
}

function AiKeyCard({ configured, keySource }: { configured: boolean; keySource?: string }) {
  const utils = trpc.useUtils();
  const [key, setKey] = useState("");
  const [open, setOpen] = useState(false);
  const setApiKey = trpc.emailCampaigns.setApiKey.useMutation({
    onSuccess: (d) => {
      utils.emailCampaigns.info.invalidate();
      setKey("");
      setOpen(false);
      toast.success(d.configured ? "AI key saved — AI design enabled." : "AI key cleared.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (configured && !open) {
    return (
      <div className="mb-5 p-3.5 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-green-800">
          <CheckCircle2 size={16} className="text-green-600" />
          AI design enabled{keySource === "env" ? " (via environment variable)" : keySource === "admin" ? " (key saved here)" : ""}.
        </div>
        <button onClick={() => setOpen(true)} className="text-[12px] font-semibold text-green-700 hover:underline">Change key</button>
      </div>
    );
  }

  return (
    <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="flex items-center gap-2 mb-1.5">
        <KeyRound size={16} className="text-blue-600" />
        <p className="text-[13px] font-semibold text-blue-900">{configured ? "Update Anthropic API key" : "Enable AI design"}</p>
      </div>
      <p className="text-[12px] text-blue-700 mb-3">
        Paste your Anthropic API key to let AI design campaigns. Get one at{" "}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline font-medium">console.anthropic.com</a>.
        It's stored securely on the server and never shown again.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-..."
          autoComplete="off"
          className="flex-1 min-w-[240px] px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 font-mono"
        />
        <button
          onClick={() => setApiKey.mutate({ key })}
          disabled={setApiKey.isPending || !key.trim()}
          className={`${BTN} bg-blue-600 text-white hover:bg-blue-700`}
        >
          {setApiKey.isPending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Save key
        </button>
        {configured && (
          <button onClick={() => setApiKey.mutate({ key: "" })} disabled={setApiKey.isPending} className={`${BTN} border border-gray-300 text-gray-600 hover:bg-gray-50`}>
            Clear
          </button>
        )}
      </div>
      <p className="text-[11px] text-blue-600/80 mt-2 flex items-start gap-1">
        <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
        Manual campaigns (write your own HTML) work without a key.
      </p>
    </div>
  );
}

function ResendCard({ configured, from }: { configured: boolean; from?: string }) {
  const utils = trpc.useUtils();
  const [key, setKey] = useState("");
  const [fromAddr, setFromAddr] = useState(from || "");
  const [open, setOpen] = useState(false);
  const setResend = trpc.emailCampaigns.setResendKey.useMutation({
    onSuccess: (d) => {
      utils.emailCampaigns.info.invalidate();
      setKey(""); setOpen(false);
      toast.success(d.configured ? "Resend connected — emails now send via Resend." : "Resend disconnected.");
    },
    onError: (e) => toast.error(e.message),
  });

  if (configured && !open) {
    return (
      <div className="mb-5 p-3.5 bg-violet-50 border border-violet-200 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-violet-800">
          <Send size={15} className="text-violet-600" />
          Sending via <strong>Resend</strong>{from ? <> · from <code className="bg-violet-100 px-1 rounded text-[12px]">{from}</code></> : " (set a verified sender below)"}.
        </div>
        <button onClick={() => setOpen(true)} className="text-[12px] font-semibold text-violet-700 hover:underline">Change</button>
      </div>
    );
  }

  return (
    <div className="mb-5 p-4 bg-violet-50 border border-violet-200 rounded-xl">
      <div className="flex items-center gap-2 mb-1.5">
        <Send size={16} className="text-violet-600" />
        <p className="text-[13px] font-semibold text-violet-900">{configured ? "Update Resend" : "Connect Resend (recommended for delivery)"}</p>
      </div>
      <p className="text-[12px] text-violet-700 mb-3">
        Resend gives far better inbox placement than Gmail SMTP. Paste your API key from{" "}
        <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline font-medium">resend.com/api-keys</a>.
        To send to customers you must <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline font-medium">verify your domain</a> and use a sender on it (e.g. <code className="bg-violet-100 px-1 rounded">noreply@nutriwow.in</code>).
      </p>
      <div className="space-y-2">
        <input
          type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="re_..." autoComplete="off"
          className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 font-mono"
        />
        <input
          type="text" value={fromAddr} onChange={(e) => setFromAddr(e.target.value)} placeholder='From (e.g. Nutriwow <noreply@nutriwow.in>)'
          className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setResend.mutate({ key, from: fromAddr })}
            disabled={setResend.isPending || !key.trim()}
            className={`${BTN} bg-violet-600 text-white hover:bg-violet-700`}
          >
            {setResend.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Save & connect
          </button>
          {configured && (
            <button onClick={() => setResend.mutate({ key: "", from: "" })} disabled={setResend.isPending} className={`${BTN} border border-gray-300 text-gray-600 hover:bg-gray-50`}>
              Disconnect
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-violet-600/80 mt-2 flex items-start gap-1">
        <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
        Until a domain is verified, Resend only delivers to your own account email. Without Resend, sending falls back to Gmail SMTP.
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    queued: "bg-yellow-100 text-yellow-700",
    sending: "bg-blue-100 text-blue-700",
    sent: "bg-green-100 text-green-700",
  };
  return <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${map[status] || map.draft}`}>{status}</span>;
}

function CampaignStatsBar({ campaignId }: { campaignId: string }) {
  const { data: stats } = trpc.emailCampaigns.getStats.useQuery({ campaignId });
  if (!stats || stats.total === 0) return null;
  const pct = (n: number) => stats.total > 0 ? Math.round((n / stats.total) * 100) : 0;
  return (
    <div className="flex items-center gap-4 mt-2">
      <span className="flex items-center gap-1 text-[11px] text-gray-500"><Send size={11} className="text-blue-500" /> {stats.sent} sent</span>
      <span className="flex items-center gap-1 text-[11px] text-gray-500"><MailOpen size={11} className="text-green-600" /> {stats.opened} opened ({pct(stats.opened)}%)</span>
      <span className="flex items-center gap-1 text-[11px] text-gray-500"><MousePointerClick size={11} className="text-orange-500" /> {stats.clicked} clicked ({pct(stats.clicked)}%)</span>
      {stats.failed > 0 && <span className="flex items-center gap-1 text-[11px] text-red-500"><AlertCircle size={11} /> {stats.failed} failed</span>}
    </div>
  );
}

function CampaignLogsDrawer({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const { data: logs = [], isLoading } = trpc.emailCampaigns.getLogs.useQuery({ campaignId });
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-[520px] bg-white h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-[14px] font-bold text-gray-900">Delivery Logs</h2>
            <p className="text-[11px] text-gray-400">{logs.length} recipients</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center"><Loader2 size={24} className="mx-auto animate-spin text-gray-300" /></div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-gray-400">No logs yet</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase">Email</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Status</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Opens</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-700 truncate max-w-[200px]">{log.email}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {log.openCount > 0 ? <span className="text-green-600 font-medium">{log.openCount}</span> : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {log.clickCount > 0 ? <span className="text-orange-600 font-medium">{log.clickCount}</span> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionalLogsTable() {
  const { data: logs = [], isLoading } = trpc.emailCampaigns.getTransactionalLogs.useQuery({ limit: 200 });

  const typeLabel = (campaignId: string) => {
    if (campaignId === "otp") return { label: "OTP", cls: "bg-purple-100 text-purple-700" };
    if (campaignId.startsWith("order-")) return { label: "Order Confirm", cls: "bg-blue-100 text-blue-700" };
    if (campaignId.startsWith("shipping-")) return { label: "Shipping Update", cls: "bg-amber-100 text-amber-700" };
    return { label: campaignId, cls: "bg-gray-100 text-gray-600" };
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" /></div>
      ) : logs.length === 0 ? (
        <p className="text-center py-8 text-[13px] text-gray-400">No transactional emails sent yet.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase">Email</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Type</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase">Sent at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(logs as any[]).map((log) => {
                const t = typeLabel(log.campaignId);
                return (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-[12px] text-gray-700 truncate max-w-[200px]">{log.email}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${t.cls}`}>{t.label}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-gray-400">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CampaignEditor({ initial, info, onBack }: {
  initial: Campaign | null;
  info?: { aiConfigured: boolean; audiences: { all: number; buyers: number; subscribers: number } };
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const sent = initial?.status === "sent";
  const [name, setName] = useState(initial?.name || "");
  const [audience, setAudience] = useState<Audience>(initial?.audience || "all");
  const [brief, setBrief] = useState("");
  const [subject, setSubject] = useState(initial?.subject || "");
  const [previewText, setPreviewText] = useState(initial?.previewText || "");
  const [html, setHtml] = useState(initial?.html || "");
  const [testEmail, setTestEmail] = useState("");

  // Product picker — features real product images/prices in the AI design
  const { data: allProducts = [] } = trpc.products.adminList.useQuery({});
  const { data: catList = [] } = trpc.categories.list.useQuery();
  const [prodCat, setProdCat] = useState("All");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const filteredProducts = (allProducts as any[]).filter(
    (p) => prodCat === "All" || p.category === prodCat
  );
  const toggleProduct = (id: number) =>
    setSelectedProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectAllInCat = () => setSelectedProductIds(filteredProducts.map((p) => p.id));
  const buildProducts = () =>
    (allProducts as any[])
      .filter((p) => selectedProductIds.includes(p.id))
      .map((p) => ({
        name: p.name,
        price: p.price,
        url: `https://nutriwow.in/products/${p.handle}`,
        image: p.image || (Array.isArray(p.images) ? p.images[0] : undefined),
      }));

  const audienceCount = audience === "buyers" ? info?.audiences.buyers : info?.audiences.all;

  const generate = trpc.emailCampaigns.generate.useMutation({
    onSuccess: (d) => { setSubject(d.subject); setPreviewText(d.previewText); setHtml(d.html); toast.success("AI draft ready — review & edit below."); },
    onError: (e) => toast.error(e.message),
  });
  const save = trpc.emailCampaigns.save.useMutation({
    onSuccess: () => { utils.emailCampaigns.list.invalidate(); toast.success("Saved"); },
    onError: (e) => toast.error(e.message),
  });
  const testSend = trpc.emailCampaigns.testSend.useMutation({
    onSuccess: () => toast.success("Test email sent ✅ — check Inbox, and also the Promotions & Spam tabs (marketing emails often land there).", { duration: 7000 }),
    onError: (e) => toast.error(e.message),
  });
  const send = trpc.emailCampaigns.send.useMutation({
    onSuccess: (d) => { utils.emailCampaigns.list.invalidate(); toast.success(`Campaign queued — sending to ${d.recipientCount} recipients in background.`); onBack(); },
    onError: (e) => toast.error(e.message),
  });

  const doSave = () => {
    if (!name.trim() || !subject.trim() || !html.trim()) { toast.error("Name, subject and content are required."); return; }
    save.mutate({ id: initial?.id, name, subject, previewText, html, audience });
  };
  const doSend = () => {
    if (!initial?.id) { toast.error("Save the campaign first."); return; }
    if (!confirm(`Send "${name}" to ${audienceCount ?? "all"} ${audience === "buyers" ? "buyers" : "customers"}? This cannot be undone.`)) return;
    send.mutate({ id: initial.id });
  };

  const inputCls = "w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#43A047]/30 focus:border-[#43A047] disabled:bg-gray-50";

  return (
    <AdminLayout title={sent ? "View Campaign" : initial ? "Edit Campaign" : "New Campaign"} subtitle="Email campaign">
      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft size={15} /> Back to campaigns
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: configure + edit */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div>
                <label className="text-[12px] font-medium text-gray-600 mb-1 block">Campaign name (internal)</label>
                <input className={inputCls} value={name} disabled={sent} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali Dry-Fruit Sale" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-600 mb-1 block">Audience</label>
                <select className={inputCls} value={audience} disabled={sent} onChange={(e) => setAudience(e.target.value as Audience)}>
                  <option value="all">All customers ({info?.audiences.all ?? "—"})</option>
                  <option value="buyers">Customers who ordered ({info?.audiences.buyers ?? "—"})</option>
                  <option value="subscribers">Newsletter subscribers ({info?.audiences.subscribers ?? "—"})</option>
                </select>
              </div>
            </div>

            {!sent && (
              <div className="bg-gradient-to-br from-[#43A047]/5 to-blue-50 rounded-xl border border-[#43A047]/20 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-[#43A047]" />
                  <p className="text-[13px] font-semibold text-gray-800">Design with AI</p>
                </div>
                <textarea
                  className={`${inputCls} h-24 resize-none`}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describe the campaign: e.g. 'Diwali sale — 20% off all gift boxes, free shipping over ₹999, warm festive tone, CTA to shop gift hampers.'"
                  disabled={!info?.aiConfigured}
                />

                {/* Feature products — AI embeds their real images + prices */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[12px] font-semibold text-gray-700">Feature products <span className="font-normal text-gray-400">(optional — {selectedProductIds.length} selected)</span></p>
                    <div className="flex items-center gap-2">
                      <select value={prodCat} onChange={(e) => setProdCat(e.target.value)} className="text-[12px] border border-gray-300 rounded-lg px-2 py-1 focus:outline-none">
                        <option value="All">All categories</option>
                        {(catList as string[]).map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <button type="button" onClick={selectAllInCat} className="text-[11px] font-semibold text-[#43A047] hover:underline">Select all</button>
                      {selectedProductIds.length > 0 && (
                        <button type="button" onClick={() => setSelectedProductIds([])} className="text-[11px] text-gray-400 hover:text-red-500">Clear</button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-50">
                    {filteredProducts.length === 0 ? (
                      <p className="text-[12px] text-gray-400 p-3">No products in this category.</p>
                    ) : filteredProducts.map((p) => (
                      <label key={p.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedProductIds.includes(p.id)} onChange={() => toggleProduct(p.id)} className="accent-[#43A047]" />
                        {p.image && <img src={p.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />}
                        <span className="text-[12px] text-gray-700 truncate flex-1">{p.name}</span>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">₹{p.price}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Selected products' images & prices are sent to the AI so it builds real product cards.</p>
                </div>

                <button
                  onClick={() => generate.mutate({ brief, products: buildProducts() })}
                  disabled={generate.isPending || !brief.trim() || !info?.aiConfigured}
                  className={`${BTN} bg-[#43A047] text-white hover:bg-[#388E3C] mt-3`}
                >
                  {generate.isPending ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={15} /> Generate with AI</>}
                </button>
                {!info?.aiConfigured && <p className="text-[11px] text-amber-700 mt-2">Add ANTHROPIC_API_KEY to enable AI generation.</p>}
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div>
                <label className="text-[12px] font-medium text-gray-600 mb-1 block">Subject line</label>
                <input className={inputCls} value={subject} disabled={sent} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-600 mb-1 block">Preview text</label>
                <input className={inputCls} value={previewText} disabled={sent} onChange={(e) => setPreviewText(e.target.value)} placeholder="Inbox preview text" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-gray-600 mb-1 block">HTML content</label>
                <textarea className={`${inputCls} h-48 font-mono text-[11px]`} value={html} disabled={sent} onChange={(e) => setHtml(e.target.value)} placeholder="<html>…</html>" />
              </div>
            </div>

            {!sent && (
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={doSave} disabled={save.isPending} className={`${BTN} bg-gray-800 text-white hover:bg-gray-900`}>
                  {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Save draft
                </button>
                <div className="flex items-center gap-2">
                  <input className={`${inputCls} w-48`} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@email.com" />
                  <button onClick={() => testSend.mutate({ to: testEmail, subject, html })} disabled={testSend.isPending || !testEmail || !html} className={`${BTN} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
                    {testSend.isPending ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Test
                  </button>
                </div>
                <button onClick={doSend} disabled={send.isPending || !initial?.id} className={`${BTN} bg-[#FF6D00] text-white hover:bg-[#e05f00] ml-auto`}>
                  {send.isPending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send to {audienceCount ?? ""} {audience === "buyers" ? "buyers" : "customers"}</>}
                </button>
              </div>
            )}
            {!sent && !initial?.id && <p className="text-[11px] text-gray-400">Save the draft before sending. Always send a test to yourself first.</p>}
          </div>

          {/* Right: live preview */}
          <div className="lg:sticky lg:top-4 self-start">
            <p className="text-[12px] font-medium text-gray-600 mb-1.5">Live preview</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              {html ? (
                <iframe title="preview" srcDoc={html} className="w-full h-[640px] bg-white" sandbox="" />
              ) : (
                <div className="h-[640px] flex items-center justify-center text-gray-300 text-[13px]">Preview appears here</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
