import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dbProductToFrontend } from "@/lib/products";
import { Upload, Send, Download, Loader2, CheckCircle, Plus, X, Users, Image, FileText, BarChart3, TrendingUp, AlertCircle, Package, Search } from "lucide-react";
import Papa from "papaparse";

export default function WhatsAppCampaigns() {
  const [campaignName, setCampaignName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [campaignImage, setCampaignImage] = useState<string>("");
  const [contacts, setContacts] = useState<Array<{ name: string; phone: string }>>([]);
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; campaignId?: number; background?: boolean; processingError?: string } | null>(null);
  const [processingCampaignId, setProcessingCampaignId] = useState<number | null>(null);
  const [audienceMode, setAudienceMode] = useState<"customers" | "upload">("customers");
  const [segment, setSegment] = useState<"all" | "recent" | "inactive">("all");
  const [campaignType, setCampaignType] = useState<"standard" | "products">("standard");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [productHeadline, setProductHeadline] = useState("");
  const [productBody, setProductBody] = useState("");
  const [productFormat, setProductFormat] = useState<"hero" | "carousel" | "catalog">("hero");

  const { data: templates } = trpc.whatsapp.getTemplates.useQuery();
  const { data: campaigns, refetch: refetchCampaigns } = trpc.whatsapp.getCampaigns.useQuery();
  const { data: customers = [] } = trpc.customers.getAll.useQuery();
  // Show ALL products in the campaign picker (not just in-stock ones), so the
  // owner can promote any product. Drafts are excluded below.
  const { data: dbProducts = [] } = trpc.products.adminList.useQuery();

  const sendCampaign = trpc.whatsapp.sendCampaign.useMutation({
    onSuccess: (result: any) => {
      refetchCampaigns();
      if (result?.status === "sending" || result?.status === "queued") {
        // Campaign is sending in background
        setSendResult({ sent: result?.total || 0, failed: 0, campaignId: result?.campaignId, background: true });
      } else {
        setSendResult({ sent: result?.sent || 0, failed: result?.failed || 0 });
      }
      setIsSending(false);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
      setIsSending(false);
    },
  });

  // Drive queued campaigns to completion from the admin UI itself (Hobby plan has
  // no frequent cron). While a campaign is queued/sending, poll processCampaignBatch
  // every 3s until it reports done, refreshing history as batches go out.
  const processBatch = trpc.whatsapp.processCampaignBatch.useMutation();
  useEffect(() => {
    if (!sendResult?.background) return;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const r: any = await processBatch.mutateAsync({ campaignId: sendResult.campaignId });
        refetchCampaigns();
        if (!stopped && r && r.done !== true) {
          setTimeout(tick, 3000);
        }
      } catch (error: any) {
        if (!stopped) {
          setSendResult((prev) => prev ? {
            ...prev,
            background: false,
            processingError: error?.message || "Campaign processing failed",
          } : prev);
        }
      }
    };
    const id = setTimeout(tick, 1500);
    return () => { stopped = true; clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendResult?.background, sendResult?.campaignId]);

  // Filter templates
  const allTemplates = useMemo(() => templates || [], [templates]);

  const selectedTemplate = useMemo(() => 
    allTemplates.find((t: any) => t.id === selectedTemplateId),
    [allTemplates, selectedTemplateId]
  );

  const products = useMemo(
    () => (dbProducts as any[]).filter((p) => p.status !== "draft").map((p) => dbProductToFrontend(p)),
    [dbProducts]
  );

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products
      .filter((product) => !q || product.name.toLowerCase().includes(q) || product.category.toLowerCase().includes(q))
      .slice(0, 200);
  }, [products, productSearch]);

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds]
  );

  // Customer segment filtering
  const segmentedCustomers = useMemo(() => {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    return (customers as any[]).filter(c => {
      if (!c.phone) return false;
      if (segment === "all") return true;
      const lastOrder = c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : 0;
      if (segment === "recent") return now - lastOrder < thirtyDays;
      if (segment === "inactive") return now - lastOrder > ninetyDays || lastOrder === 0;
      return true;
    });
  }, [customers, segment]);

  // Get final phone list based on mode
  const finalPhones = useMemo(() => {
    if (audienceMode === "customers") {
      return segmentedCustomers.map((c: any) => ({
        phone: (c.phone || "").toString().replace(/\D/g, ""),
        name: c.name || "Customer",
      }));
    }
    return contacts;
  }, [audienceMode, segmentedCustomers, contacts]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert("Image size must be less than 20MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setCampaignImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const parsedContacts = results.data
          .map((row: any) => ({
            name: row.name || row.Name || row.customer_name || "",
            phone: (row.phone || row.Phone || row.number || row.Number || row.mobile || row.Mobile || "").toString().replace(/\D/g, ""),
          }))
          .filter((c: any) => c.phone && c.phone.length >= 10);

        if (parsedContacts.length === 0) {
          alert("No valid contacts found. CSV must have 'name' and 'phone' columns.");
          return;
        }

        setContacts(prev => {
          const existingPhones = new Set(prev.map(p => p.phone));
          const newContacts = parsedContacts.filter((c: any) => !existingPhones.has(c.phone));
          return [...prev, ...newContacts];
        });
      },
      error: (error: any) => {
        alert(`CSV parsing error: ${error.message}`);
      },
    });
  };

  const addManualContact = () => {
    const phone = manualPhone.replace(/\D/g, "");
    if (phone.length < 10) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }
    if (contacts.some(c => c.phone === phone)) {
      alert("This number is already added");
      return;
    }
    setContacts(prev => [...prev, { name: manualName || "Customer", phone }]);
    setManualPhone("");
    setManualName("");
  };

  const removeContact = (phone: string) => {
    setContacts(prev => prev.filter(c => c.phone !== phone));
  };

  const downloadSampleCSV = () => {
    const sample = "name,phone\nAhmed Khan,9876543210\nFatima Ali,9876543211\nRahul Singh,9876543212";
    const blob = new Blob([sample], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_contacts.csv";
    a.click();
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplateId || !campaignName || finalPhones.length === 0) {
      alert("Please select a template, enter campaign name, and add contacts");
      return;
    }
    if (campaignType === "products" && selectedProductIds.length === 0) {
      alert("Please select at least one product for the product campaign");
      return;
    }

    setIsSending(true);
    setSendResult(null);

    const message = selectedTemplate?.title || campaignName;

    await sendCampaign.mutateAsync({
      campaignName: campaignName,
      templateId: selectedTemplateId,
      phones: finalPhones,
      message,
      imageUrl: campaignImage || undefined,
      targetSegment: audienceMode === "customers" ? segment : "uploaded",
      productIds: campaignType === "products" ? selectedProductIds : undefined,
      productHeadline: campaignType === "products" ? (productHeadline || campaignName) : undefined,
      productBody: campaignType === "products" ? (productBody || message) : undefined,
      productFormat: campaignType === "products" ? productFormat : undefined,
    });
  };

  const processCampaignNow = async (campaignId: number) => {
    setProcessingCampaignId(campaignId);
    try {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const result: any = await processBatch.mutateAsync({ campaignId });
        await refetchCampaigns();
        if (result?.done === true) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error: any) {
      alert(`Campaign processing failed: ${error?.message || "Unknown error"}`);
    } finally {
      setProcessingCampaignId(null);
    }
  };

  const resetForm = () => {
    setSelectedTemplateId(null);
    setContacts([]);
    setCampaignName("");
    setCampaignImage("");
    setSendResult(null);
    setManualPhone("");
    setManualName("");
    setCampaignType("standard");
    setSelectedProductIds([]);
    setProductSearch("");
    setProductHeadline("");
    setProductBody("");
    setProductFormat("hero");
  };

  // Daily stats query
  const { data: dailyStats } = trpc.whatsapp.getDailyStats.useQuery();

  return (
    <div className="space-y-4">
      {/* Daily Messaging Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Send className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Sent Today</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{dailyStats?.sentToday ?? 0}</p>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Delivered Today</span>
          </div>
          <p className="text-xl font-bold text-green-600">{dailyStats?.deliveredToday ?? 0}</p>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500 font-medium">Daily Limit</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{dailyStats?.dailyLimit ?? 10000}</p>
          <p className="text-[10px] text-gray-400">{dailyStats?.tier || 'TIER_10K'}</p>
        </div>
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className={`w-4 h-4 ${(dailyStats?.remaining ?? 10000) < 50 ? 'text-red-500' : 'text-emerald-500'}`} />
            <span className="text-xs text-gray-500 font-medium">Remaining</span>
          </div>
          <p className={`text-xl font-bold ${(dailyStats?.remaining ?? 10000) < 50 ? 'text-red-600' : 'text-emerald-600'}`}>
            {dailyStats?.remaining ?? 10000}
          </p>
          {(dailyStats?.remaining ?? 10000) < 50 && (
            <p className="text-[10px] text-red-500">Low limit!</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: New Campaign */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="w-5 h-5 text-green-600" />
            New Campaign
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sendResult ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
              <h3 className="text-xl font-bold text-green-800">
                {sendResult.background ? "Campaign Started!" : "Campaign Sent!"}
              </h3>
              <p className="text-gray-600">
                {sendResult.processingError
                  ? `Campaign queued, but processing stopped: ${sendResult.processingError}`
                  : sendResult.background
                  ? `Processing ${sendResult.sent} messages for this campaign now. History will update automatically.`
                  : `${sendResult.sent} messages sent, ${sendResult.failed} failed`
                }
              </p>
              <Button onClick={resetForm} className="mt-4">Create New Campaign</Button>
            </div>
          ) : (
            <>
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Campaign Name</label>
                <Input
                  placeholder="e.g., Diwali Sale 2025"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              {/* Campaign Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  Campaign Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={campaignType === "standard" ? "default" : "outline"}
                    onClick={() => setCampaignType("standard")}
                    className="justify-start"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Normal Template
                  </Button>
                  <Button
                    type="button"
                    variant={campaignType === "products" ? "default" : "outline"}
                    onClick={() => setCampaignType("products")}
                    className="justify-start"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Product Cards
                  </Button>
                </div>
              </div>

              {/* Template Selection - Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Select Template
                </label>
                {allTemplates.length === 0 ? (
                  <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                    No templates created yet. Go to Templates tab to create one.
                  </p>
                ) : (
                  <Select 
                    value={selectedTemplateId?.toString() || ""} 
                    onValueChange={(v) => setSelectedTemplateId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allTemplates.map((template: any) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          <span className="flex items-center gap-2">
                            {template.name} 
                            <Badge variant="outline" className={
                              template.approvalStatus === "approved" 
                                ? "text-green-700 border-green-300 text-xs" 
                                : "text-yellow-700 border-yellow-300 text-xs"
                            }>
                              {template.approvalStatus}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedTemplate && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                    <p className="text-gray-700">{selectedTemplate.title}</p>
                    {selectedTemplate.imageUrl && (
                      <img src={selectedTemplate.imageUrl} alt="" className="w-16 h-16 object-cover rounded mt-1" />
                    )}
                  </div>
                )}
              </div>

              {campaignType === "products" && (
                <div className="space-y-3 border rounded-lg p-3 bg-emerald-50/40">
                  {/* Product campaign format */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Format</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={productFormat === "hero" ? "default" : "outline"}
                        onClick={() => setProductFormat("hero")}
                        className="justify-start h-auto py-2"
                      >
                        <div className="text-left">
                          <div className="text-sm font-semibold">Hero (big)</div>
                          <div className="text-[10px] opacity-80">Har product ka bada image, alag message</div>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={productFormat === "carousel" ? "default" : "outline"}
                        onClick={() => setProductFormat("carousel")}
                        className="justify-start h-auto py-2"
                      >
                        <div className="text-left">
                          <div className="text-sm font-semibold">Carousel</div>
                          <div className="text-[10px] opacity-80">Sab ek swipeable message me (chhote cards)</div>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={productFormat === "catalog" ? "default" : "outline"}
                        onClick={() => setProductFormat("catalog")}
                        className="justify-start h-auto py-2"
                      >
                        <div className="text-left">
                          <div className="text-sm font-semibold">Catalog (Tata)</div>
                          <div className="text-[10px] opacity-80">Live price, View/cart cards</div>
                        </div>
                      </Button>
                    </div>
                    {productFormat === "catalog" && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                        Catalog format WhatsApp ke native product cards bhejta hai. Ye free-form send sirf 24h customer-service window me deliver hota hai; cold broadcast ke liye approved MPM marketing template chahiye.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Product Campaign Headline</label>
                    <Input
                      placeholder="e.g., Summer Pantry Sale Live Now"
                      value={productHeadline}
                      onChange={(e) => setProductHeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Message Body</label>
                    <Input
                      placeholder="e.g., Up to 20% off on handpicked Nutriwow products"
                      value={productBody}
                      onChange={(e) => setProductBody(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Products ({selectedProductIds.length}/10)</label>
                    <div className="relative mb-2">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded bg-white divide-y">
                      {filteredProducts.map((product) => {
                        const selected = selectedProductIds.includes(product.id);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setSelectedProductIds((prev) => {
                                if (prev.includes(product.id)) return prev.filter((id) => id !== product.id);
                                if (prev.length >= 10) return prev;
                                return [...prev, product.id];
                              });
                            }}
                            className={`w-full flex items-center gap-3 p-2 text-left hover:bg-gray-50 ${selected ? "bg-green-50" : ""}`}
                          >
                            <input type="checkbox" checked={selected} readOnly className="accent-green-600" />
                            <img src={product.images?.[0] || product.image} alt="" className="w-12 h-12 rounded object-cover bg-gray-100" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-xs text-gray-500">₹{product.price.toLocaleString("en-IN")} {product.weight && `· ${product.weight}`}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {selectedProducts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">WhatsApp product preview</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {selectedProducts.map((product) => (
                          <div key={product.id} className="min-w-[160px] max-w-[160px] bg-white border rounded-lg overflow-hidden">
                            <img src={product.images?.[0] || product.image} alt="" className="w-full h-24 object-cover bg-gray-100" />
                            <div className="p-2">
                              <p className="text-xs font-semibold line-clamp-2">{product.name}</p>
                              <p className="text-xs text-gray-600 mt-1">₹{product.price.toLocaleString("en-IN")}</p>
                              <p className="text-xs text-green-700 font-semibold mt-1">View · Shop now</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-2">
                        {productFormat === "hero"
                          ? "Hero: har selected product ek bada image (photo + naam + price + Shop now) ke roop me jayega — har product ka alag message."
                          : productFormat === "carousel"
                          ? "Carousel: sab products ek hi swipeable message me jayenge (chhote cards — WhatsApp ki limit). Best: 10 products select karein."
                          : "Catalog: ek native WhatsApp product list jayegi jisme live catalog price, View aur cart controls aayenge. Best for inbound/warm customers."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Campaign Image */}
              {campaignType === "standard" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Image className="w-4 h-4 inline mr-1" />
                  Campaign Image (Optional)
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-sm"
                />
                {campaignImage && (
                  <div className="mt-2 relative inline-block">
                    <img src={campaignImage} alt="Preview" className="w-24 h-24 object-cover rounded" />
                    <button 
                      onClick={() => setCampaignImage("")}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              )}

              {/* Target Customers */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Target Customers
                </label>

                {/* Toggle: Customers DB or Upload */}
                <div className="flex gap-2 mb-3">
                  <Button
                    variant={audienceMode === "customers" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudienceMode("customers")}
                    className="text-xs"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    From Database
                  </Button>
                  <Button
                    variant={audienceMode === "upload" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAudienceMode("upload")}
                    className="text-xs"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Upload / Manual
                  </Button>
                </div>

                {audienceMode === "customers" ? (
                  /* Customer Segment Selection */
                  <div className="space-y-2">
                    <Select value={segment} onValueChange={(v: any) => setSegment(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="recent">Recent Buyers (last 30 days)</SelectItem>
                        <SelectItem value="inactive">Inactive (90+ days no order)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">
                        {segmentedCustomers.length} customers selected
                      </Badge>
                    </div>
                  </div>
                ) : (
                  /* Upload / Manual Mode */
                  <div className="space-y-3">
                    {/* Phone count badge */}
                    {contacts.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">
                          {contacts.length} phone numbers added
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => setContacts([])} className="text-red-500 text-xs h-6">
                          Clear All
                        </Button>
                      </div>
                    )}

                    {/* CSV Upload */}
                    <div className="border border-dashed border-gray-300 rounded p-3 text-center">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleCSVUpload}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label htmlFor="csv-upload" className="cursor-pointer">
                        <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                        <p className="text-xs text-gray-600">Upload CSV/Excel with phone numbers</p>
                        <p className="text-xs text-gray-400">Columns: name, phone</p>
                      </label>
                      <Button variant="link" size="sm" onClick={downloadSampleCSV} className="text-xs mt-1">
                        <Download className="w-3 h-3 mr-1" />
                        Download Sample CSV
                      </Button>
                    </div>

                    {/* Manual Add */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Name"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="flex-1 text-sm"
                      />
                      <Input
                        placeholder="Phone number"
                        value={manualPhone}
                        onChange={(e) => setManualPhone(e.target.value)}
                        className="flex-1 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && addManualContact()}
                      />
                      <Button
                        size="sm"
                        onClick={addManualContact}
                        variant="outline"
                        aria-label="Add manual contact"
                        className="gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>

                    {/* Contact List Preview */}
                    {contacts.length > 0 && (
                      <div className="space-y-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {contacts.length} uploaded/manual contact{contacts.length === 1 ? "" : "s"} selected
                        </Badge>
                        <div className="max-h-32 overflow-y-auto border rounded text-xs">
                          <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="text-left p-1 pl-2">Name</th>
                                <th className="text-left p-1">Phone</th>
                                <th className="p-1 w-6"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {contacts.slice(0, 10).map((c, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="p-1 pl-2">{c.name}</td>
                                  <td className="p-1">{c.phone}</td>
                                  <td className="p-1">
                                    <button onClick={() => removeContact(c.phone)} className="text-red-400 hover:text-red-600" aria-label={`Remove ${c.phone}`}>
                                      <X className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {contacts.length > 10 && (
                                <tr className="border-t">
                                  <td colSpan={3} className="p-1 text-center text-gray-500">
                                    +{contacts.length - 10} more contacts
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Warning for non-approved templates */}
              {selectedTemplate && selectedTemplate.approvalStatus !== "approved" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-xs text-yellow-800">
                    ⚠️ WhatsApp Business API mein promotional messages ke liye Meta se approved template chahiye hota hai.
                    Template "{selectedTemplate.name}" abhi <strong>{selectedTemplate.approvalStatus}</strong> hai.
                  </p>
                </div>
              )}

              {/* Send Button */}
              <Button
                onClick={handleSendCampaign}
                disabled={isSending || !selectedTemplateId || !campaignName || finalPhones.length === 0 || (campaignType === "products" && selectedProductIds.length === 0)}
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                size="lg"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send to {finalPhones.length} Customers
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Right: Campaign History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Campaign History</CardTitle>
        </CardHeader>
        <CardContent>
          {!campaigns || campaigns.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No campaigns sent yet</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {campaigns.map((campaign: any) => (
                <div key={campaign.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{campaign.name}</h4>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {campaign.message}
                      </p>
                      {campaign.productCampaign && (
                        <Badge variant="outline" className="mt-1 text-green-700 border-green-300">
                          Product cards: {campaign.productCampaign.products.length}
                        </Badge>
                      )}
                    </div>
                    <Badge className={
                      campaign.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : campaign.status === "sending"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }>
                      {campaign.status}
                    </Badge>
                  </div>
                  {(campaign.status === "queued" || campaign.status === "sending") && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 h-8"
                      disabled={processingCampaignId === campaign.id}
                      onClick={() => processCampaignNow(campaign.id)}
                    >
                      {processingCampaignId === campaign.id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Process now"
                      )}
                    </Button>
                  )}
                  <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <span className="flex gap-2 flex-wrap">
                      <span className="text-green-600">✓ {campaign.totalSent || 0} sent</span>
                      <span className="text-blue-600">📨 {campaign.totalDelivered || 0} delivered</span>
                      <span className="text-red-500">✗ {campaign.totalFailed || 0} failed</span>
                      {(() => {
                        const pending = (campaign.totalSent || 0) - (campaign.totalDelivered || 0) - (campaign.totalFailed || 0);
                        return pending > 0 ? <span className="text-amber-600">⏳ {pending} delivery pending</span> : null;
                      })()}
                    </span>
                    <span>{new Date(campaign.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
