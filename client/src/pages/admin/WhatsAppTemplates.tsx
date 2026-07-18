import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Trash2, CheckCircle, Clock, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppTemplates() {
  const [isCreating, setIsCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    buttonText: "Shop now",
    buttonUrl: "",
    imageUrl: "",
  });

  const { data: templates, isLoading, refetch } = trpc.whatsapp.getTemplates.useQuery();
  const createTemplate = trpc.whatsapp.createTemplate.useMutation({
    onSuccess: () => {
      refetch();
      setFormData({ name: "", title: "", buttonText: "Shop now", buttonUrl: "", imageUrl: "" });
      setIsCreating(false);
      toast.success("Template created successfully!");
    },
    onError: (error: any) => toast.error(`Error: ${error.message}`),
  });

  const deleteTemplate = trpc.whatsapp.deleteTemplate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Template deleted!");
    },
    onError: (error: any) => toast.error(`Error: ${error.message}`),
  });

  const submitTemplate = trpc.whatsapp.submitTemplateToMeta.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Template submitted to Meta for approval!");
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const refreshStatuses = trpc.whatsapp.refreshTemplateStatuses.useMutation({
    onSuccess: (data: any) => {
      refetch();
      setRefreshing(false);
      const parts = [];
      if (data.imported > 0) parts.push(`${data.imported} imported from Meta`);
      if (data.updated > 0) parts.push(`${data.updated} status updated`);
      if (parts.length > 0) {
        toast.success(parts.join(", ") + "!");
      } else {
        toast.info("All templates are up to date. No changes.");
      }
    },
    onError: (error) => {
      setRefreshing(false);
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleRefreshStatus = () => {
    setRefreshing(true);
    refreshStatuses.mutate();
  };

  const handleCreateTemplate = () => {
    if (!formData.name || !formData.title || !formData.buttonUrl) {
      toast.error("Please fill in all required fields");
      return;
    }
    createTemplate.mutate(formData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">WhatsApp Templates</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshStatus}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {refreshing ? "Checking..." : "Refresh Status"}
          </Button>
          <Button onClick={() => setIsCreating(!isCreating)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Template Name</label>
              <Input
                placeholder="e.g., Summer Sale 2026"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Offer Text (Required)</label>
              <Textarea
                placeholder="e.g., Get Free Gift on order above ₹2199. Use Code: FREEITEM"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Product Image (File or URL)</label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 20 * 1024 * 1024) {
                      toast.error("Image size must be less than 20MB");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64 = event.target?.result as string;
                      setFormData({ ...formData, imageUrl: base64 });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <div className="text-xs text-gray-500">Or paste image URL:</div>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl.startsWith("data:") ? "" : formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>
              {formData.imageUrl && (
                <img src={formData.imageUrl} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Button Text</label>
              <Input
                placeholder="e.g., Shop now"
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Button URL (Required)</label>
              <Input
                placeholder="https://www.foodondoor.com/collections/all"
                value={formData.buttonUrl}
                onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>
                {createTemplate.isPending ? "Creating..." : "Create Template"}
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p>Loading templates...</p>
      ) : templates && templates.length > 0 ? (
        <div className="grid gap-4">
          {templates.map((template: any) => (
            <Card key={template.id}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {template.imageUrl && (
                    <img src={template.imageUrl} alt={template.name} className="w-24 h-24 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                        <p className="text-sm text-gray-600">{template.title}</p>
                      </div>
                      <Badge className={getStatusColor(template.approvalStatus)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(template.approvalStatus)}
                          {template.approvalStatus}
                        </span>
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      <p>Button: {template.buttonText}</p>
                      <p className="truncate">URL: {template.buttonUrl}</p>
                    </div>

                    {template.approvalMessage && (
                      <p className="text-sm text-gray-500 mb-2">
                        <strong>Meta Response:</strong> {template.approvalMessage}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {template.approvalStatus === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => submitTemplate.mutate(template.id)}
                          disabled={submitTemplate.isPending}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Submit to Meta
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Delete this template?")) {
                            deleteTemplate.mutate(template.id);
                          }
                        }}
                        disabled={deleteTemplate.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No templates created yet. Click "New Template" to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
