import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useAllCalls } from "../../../services/hooks";
import { deleteKBDocument, getAllKBDocuments, updateKBDocument, uploadKBDocument } from "../../../services/kbService";
import { getBenchmarkTranscripts, saveBenchmarkTranscript } from "../../../services/benchmarkService";

export function AdminConfigurationDashboard() {
  const { data: callsData } = useAllCalls();
  const calls = (callsData as any[]) || [];

  const [benchmarkRows, setBenchmarkRows] = useState<any[]>([]);
  const [selectedBenchmarkCallId, setSelectedBenchmarkCallId] = useState<string>("");
  const [benchmarkTitle, setBenchmarkTitle] = useState("");
  const [benchmarkNotes, setBenchmarkNotes] = useState("");
  const [benchmarkMessage, setBenchmarkMessage] = useState("");
  const [isSavingBenchmark, setIsSavingBenchmark] = useState(false);

  const [kbDocuments, setKbDocuments] = useState<any[]>([]);
  const [editingKBDocumentId, setEditingKBDocumentId] = useState<string | null>(null);
  const [kbMessage, setKbMessage] = useState("");
  const [isSavingKB, setIsSavingKB] = useState(false);
  const [deletingKBDocumentId, setDeletingKBDocumentId] = useState<string | null>(null);
  const [kbForm, setKbForm] = useState({
    title: "",
    description: "",
    category: "general",
    documentType: "playbook" as "playbook" | "sop" | "faq" | "script" | "objection_handling" | "product_guide",
    content: "",
    tags: "",
  });

  const loadData = async () => {
    const [benchmarks, docs] = await Promise.all([
      getBenchmarkTranscripts(),
      getAllKBDocuments(),
    ]);
    setBenchmarkRows(benchmarks);
    setKbDocuments(docs.slice(0, 20));
  };

  useEffect(() => {
    loadData();
  }, []);

  const benchmarkAvg = useMemo(() => {
    const benchmarkCallIds = new Set(benchmarkRows.map((row) => row.call_id));
    const selectedCalls = calls.filter((call) => benchmarkCallIds.has(call.id));
    if (!selectedCalls.length) return null;
    const scores = selectedCalls
      .map((call) => call.score)
      .filter((score) => typeof score === "number");
    if (!scores.length) return null;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [benchmarkRows, calls]);

  const handleSaveBenchmark = async () => {
    if (isSavingBenchmark) return;

    if (!selectedBenchmarkCallId) {
      setBenchmarkMessage("Please select a call to save as benchmark.");
      return;
    }

    const selectedCall = calls.find((call) => call.id === selectedBenchmarkCallId);
    if (!selectedCall?.rep_id) {
      setBenchmarkMessage("Selected call does not have a valid rep assignment.");
      return;
    }

    setIsSavingBenchmark(true);
    try {
      const ok = await saveBenchmarkTranscript({
        repId: selectedCall.rep_id,
        callId: selectedCall.id,
        title: benchmarkTitle || `${selectedCall.rep_name || "Rep"} - ${selectedCall.customer_name || "Customer"}`,
        notes: benchmarkNotes,
      });

      if (!ok) {
        setBenchmarkMessage("Unable to save benchmark. Please verify RLS policies and table access.");
        return;
      }

      setBenchmarkMessage("Benchmark was saved successfully.");
      setSelectedBenchmarkCallId("");
      setBenchmarkTitle("");
      setBenchmarkNotes("");
      await loadData();
    } finally {
      setIsSavingBenchmark(false);
    }
  };

  const handleUploadKB = async () => {
    if (isSavingKB) return;

    if (!kbForm.title.trim() || !kbForm.content.trim()) {
      setKbMessage("Title and content are required.");
      return;
    }

    const tags = kbForm.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setIsSavingKB(true);
    try {
      const doc = editingKBDocumentId
        ? await updateKBDocument(editingKBDocumentId, {
            title: kbForm.title.trim(),
            description: kbForm.description.trim(),
            contentText: kbForm.content.trim(),
            documentType: kbForm.documentType,
            category: kbForm.category.trim() || "general",
            tags,
          })
        : await uploadKBDocument(
            kbForm.title.trim(),
            kbForm.description.trim(),
            kbForm.content.trim(),
            kbForm.documentType,
            kbForm.category.trim() || "general",
            tags
          );

      if (!doc) {
        setKbMessage(editingKBDocumentId ? "Unable to update knowledge base document." : "Unable to upload knowledge base document.");
        return;
      }

      setKbMessage(editingKBDocumentId ? "Knowledge base document updated and embeddings refreshed." : "Knowledge base document uploaded and embedding process started.");
      setEditingKBDocumentId(null);
      setKbForm({
        title: "",
        description: "",
        category: "general",
        documentType: "playbook",
        content: "",
        tags: "",
      });
      await loadData();
    } finally {
      setIsSavingKB(false);
    }
  };

  const handleEditKBDocument = (doc: any) => {
    setEditingKBDocumentId(doc.id);
    setKbForm({
      title: doc.title || "",
      description: doc.description || "",
      category: doc.category || "general",
      documentType: doc.document_type || "playbook",
      content: doc.content_text || "",
      tags: Array.isArray(doc.tags) ? doc.tags.join(", ") : "",
    });
    setKbMessage(`Editing: ${doc.title}`);
  };

  const handleDeleteKBDocument = async (doc: any) => {
    if (deletingKBDocumentId || isSavingKB) return;

    const confirmDelete = window.confirm(`Delete KB document \"${doc.title}\"? This will remove all related embeddings.`);
    if (!confirmDelete) return;

    setDeletingKBDocumentId(doc.id);
    try {
      const deleted = await deleteKBDocument(doc.id);
      if (!deleted) {
        setKbMessage("Unable to delete knowledge base document.");
        return;
      }

      if (editingKBDocumentId === doc.id) {
        setEditingKBDocumentId(null);
        setKbForm({
          title: "",
          description: "",
          category: "general",
          documentType: "playbook",
          content: "",
          tags: "",
        });
      }

      setKbMessage("Knowledge base document deleted.");
      await loadData();
    } finally {
      setDeletingKBDocumentId(null);
    }
  };

  const cancelKBDocumentEdit = () => {
    setEditingKBDocumentId(null);
    setKbForm({
      title: "",
      description: "",
      category: "general",
      documentType: "playbook",
      content: "",
      tags: "",
    });
    setKbMessage("Edit cancelled.");
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <div className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] text-white px-8 py-8 shadow-2xl border-b border-cyan-500/20">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-cyan-400">Admin Configuration</h1>
          <p className="text-cyan-200">Benchmark and Knowledge Base management</p>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-8 grid grid-cols-2 gap-6">
        <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10">
          <h2 className="text-lg font-semibold text-cyan-400 mb-4">Benchmark Management</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
              <p className="text-xs text-gray-400">Approved Benchmarks</p>
              <p className="text-2xl font-bold text-white">{benchmarkRows.length}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-gray-400">Benchmark Avg Score</p>
              <p className="text-2xl font-bold text-white">{benchmarkAvg ?? "N/A"}</p>
            </div>
          </div>

          <div className="space-y-3">
            <select
              value={selectedBenchmarkCallId}
              onChange={(e) => setSelectedBenchmarkCallId(e.target.value)}
              className="w-full bg-[#0f172a] border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="">Select a call to mark as benchmark</option>
              {calls
                .filter((call) => Boolean(call.id && call.rep_id))
                .map((call) => (
                  <option key={call.id} value={call.id}>
                    {call.rep_name || "Rep"} • {call.customer_name || "Customer"}
                  </option>
                ))}
            </select>

            <input
              type="text"
              value={benchmarkTitle}
              onChange={(e) => setBenchmarkTitle(e.target.value)}
              placeholder="Benchmark title"
              className="w-full bg-[#0f172a] border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            />

            <textarea
              value={benchmarkNotes}
              onChange={(e) => setBenchmarkNotes(e.target.value)}
              placeholder="Benchmark notes"
              rows={3}
              className="w-full bg-[#0f172a] border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            />

            <Button
              onClick={handleSaveBenchmark}
              disabled={isSavingBenchmark}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingBenchmark ? "Saving..." : "Save Benchmark"}
            </Button>

            {benchmarkMessage && <p className="text-xs text-gray-300">{benchmarkMessage}</p>}
          </div>
        </Card>

        <Card className="p-6 border border-cyan-500/30 bg-[#1e293b] shadow-lg shadow-cyan-500/10">
          <h2 className="text-lg font-semibold text-cyan-400 mb-4">Knowledge Base Documents</h2>

          <div className="space-y-3">
            <input
              type="text"
              value={kbForm.title}
              onChange={(e) => setKbForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Document title"
              className="w-full bg-[#0f172a] border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={kbForm.documentType}
                onChange={(e) => setKbForm((prev) => ({ ...prev, documentType: e.target.value as any }))}
                className="bg-[#0f172a] border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="playbook">Playbook</option>
                <option value="sop">SOP</option>
                <option value="faq">FAQ</option>
                <option value="script">Script</option>
                <option value="objection_handling">Objection Handling</option>
                <option value="product_guide">Product Guide</option>
              </select>
              <input
                type="text"
                value={kbForm.category}
                onChange={(e) => setKbForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="Category"
                className="bg-[#0f172a] border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <input
              type="text"
              value={kbForm.description}
              onChange={(e) => setKbForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Description"
              className="w-full bg-[#0f172a] border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            />

            <input
              type="text"
              value={kbForm.tags}
              onChange={(e) => setKbForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="Tags (comma separated)"
              className="w-full bg-[#0f172a] border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            />

            <textarea
              value={kbForm.content}
              onChange={(e) => setKbForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Paste playbook/SOP/FAQ content here"
              rows={6}
              className="w-full bg-[#0f172a] border border-cyan-500/30 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            />

            <Button
              onClick={handleUploadKB}
              disabled={isSavingKB || !!deletingKBDocumentId}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingKB
                ? (editingKBDocumentId ? "Updating..." : "Uploading...")
                : (editingKBDocumentId ? "Update Knowledge Base Document" : "Upload to Knowledge Base")}
            </Button>

            {editingKBDocumentId && (
              <Button
                onClick={cancelKBDocumentEdit}
                disabled={isSavingKB || !!deletingKBDocumentId}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white border-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel Edit
              </Button>
            )}

            {kbMessage && <p className="text-xs text-gray-300">{kbMessage}</p>}

            <div className="pt-2 border-t border-cyan-500/20">
              <p className="text-xs text-gray-400 mb-2">KB history</p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {kbDocuments.length === 0 && <p className="text-xs text-gray-500">No KB documents yet</p>}
                {kbDocuments.map((doc) => (
                  <div key={doc.id} className="rounded-lg border border-cyan-500/20 bg-[#0f172a] p-2">
                    <p className="text-xs text-gray-100 font-medium">{doc.title}</p>
                    <p className="text-[11px] text-gray-400">{doc.document_type} • {doc.category || "general"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        onClick={() => handleEditKBDocument(doc)}
                        disabled={isSavingKB || !!deletingKBDocumentId}
                        className="h-7 px-2 bg-cyan-700/40 hover:bg-cyan-700/60 text-cyan-100 border border-cyan-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDeleteKBDocument(doc)}
                        disabled={isSavingKB || !!deletingKBDocumentId}
                        className="h-7 px-2 bg-red-700/40 hover:bg-red-700/60 text-red-100 border border-red-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deletingKBDocumentId === doc.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
