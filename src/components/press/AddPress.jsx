import React, { useState, useRef, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { IoTrashOutline } from "react-icons/io5";

function AddPress() {
  const [activeSection, setActiveSection] = useState("articles");

  // Articles state
  const [articles, setArticles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ titleEn: "", titleSr: "", textEn: "", textSr: "" });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [articleStatus, setArticleStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingImage, setDeletingImage] = useState(null); // "articleId-imageIndex"
  const [togglingId, setTogglingId] = useState(null);
  const fileInputRef = useRef(null);

  // YouTube state
  const [videoIds, setVideoIds] = useState([]);
  const [newVideoInput, setNewVideoInput] = useState("");
  const [videoStatus, setVideoStatus] = useState(null);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [removingVideoIndex, setRemovingVideoIndex] = useState(null);

  const loadData = () => {
    apiClient.getAllPress().then(data => {
      setArticles(data.articles || []);
      setVideoIds(data.videoIds || []);
    }).catch(err => console.error('Failed to load press data:', err));
  };

  useEffect(() => { loadData(); }, []);

  // --- Articles ---
  const resetForm = () => {
    setForm({ titleEn: "", titleSr: "", textEn: "", textSr: "" });
    setSelectedFiles([]);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = (article) => {
    setEditingId(article.id);
    setForm({
      titleEn: article.titleEn || "",
      titleSr: article.titleSr || "",
      textEn: article.textEn || "",
      textSr: article.textSr || "",
    });
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!form.titleEn.trim()) { alert("Title (EN) is required."); return; }
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    selectedFiles.forEach(f => formData.append("images", f));
    setIsSubmitting(true);
    try {
      if (editingId) {
        await apiClient.updatePressArticle(editingId, formData);
      } else {
        await apiClient.createPressArticle(formData);
      }
      resetForm();
      loadData();
      setArticleStatus("success");
    } catch (err) {
      console.error(err);
      setArticleStatus("error");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setArticleStatus(null), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this article and all its images?")) return;
    setDeletingId(id);
    try {
      await apiClient.deletePressArticle(id);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteImage = async (articleId, imageIndex) => {
    if (!window.confirm("Remove this image?")) return;
    setDeletingImage(`${articleId}-${imageIndex}`);
    try {
      await apiClient.deletePressImage(articleId, imageIndex);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingImage(null);
    }
  };

  // --- YouTube ---
  const extractVideoId = (input) => {
    const trimmed = input.trim();
    try {
      const url = new URL(trimmed);
      return url.searchParams.get("v") || url.pathname.split("/").pop();
    } catch {
      return trimmed; // assume it's already an ID
    }
  };

  const handleAddVideo = async () => {
    const id = extractVideoId(newVideoInput);
    if (!id) return;
    const updated = [id, ...videoIds];
    setIsAddingVideo(true);
    try {
      await apiClient.updateVideoIds(updated);
      setVideoIds(updated);
      setNewVideoInput("");
      setVideoStatus("success");
    } catch (err) {
      setVideoStatus("error");
    } finally {
      setIsAddingVideo(false);
      setTimeout(() => setVideoStatus(null), 3000);
    }
  };

  const handleRemoveVideo = async (index) => {
    if (removingVideoIndex === index) return;
    const updated = videoIds.filter((_, i) => i !== index);
    setRemovingVideoIndex(index);
    try {
      await apiClient.updateVideoIds(updated);
      setVideoIds(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setRemovingVideoIndex(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl text-center py-4">Manage Press</h1>

      {/* Section tabs */}
      <div className="flex justify-center border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveSection("articles")}
          className={`px-8 py-2 text-sm font-medium transition-colors ${activeSection === "articles" ? "border-b-2 border-gray-700 text-gray-700" : "text-gray-400 hover:text-gray-600"}`}
        >
          Articles
        </button>
        <button
          onClick={() => setActiveSection("videos")}
          className={`px-8 py-2 text-sm font-medium transition-colors ${activeSection === "videos" ? "border-b-2 border-gray-700 text-gray-700" : "text-gray-400 hover:text-gray-600"}`}
        >
          YouTube Videos
        </button>
      </div>

      {/* Articles section */}
      {activeSection === "articles" && (
        <div>
          {/* Form */}
          <div className="w-2/3 max-w-2xl bg-gray-100 flex flex-col gap-2 mx-auto rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-600 mb-2">
              {editingId ? "Edit Article" : "New Article"}
            </h2>

            <label className="text-gray-500 text-sm">TITLE (EN)</label>
            <input value={form.titleEn} onChange={e => setForm(p => ({ ...p, titleEn: e.target.value }))}
              placeholder="Article title..." className="border border-gray-400 px-2 rounded-lg" />

            <label className="text-gray-500 text-sm">NASLOV (SR)</label>
            <input value={form.titleSr} onChange={e => setForm(p => ({ ...p, titleSr: e.target.value }))}
              placeholder="Naslov članka..." className="border border-gray-400 px-2 rounded-lg" />

            <label className="text-gray-500 text-sm">TEXT (EN)</label>
            <textarea value={form.textEn} onChange={e => setForm(p => ({ ...p, textEn: e.target.value }))}
              placeholder="Article text..." rows={4}
              className="border border-gray-400 px-2 rounded-lg resize-none" />

            <label className="text-gray-500 text-sm">TEKST (SR)</label>
            <textarea value={form.textSr} onChange={e => setForm(p => ({ ...p, textSr: e.target.value }))}
              placeholder="Tekst članka..." rows={4}
              className="border border-gray-400 px-2 rounded-lg resize-none" />

            <label className="text-gray-500 text-sm">
              IMAGES {editingId ? "(adds to existing)" : "(select multiple)"}
            </label>
            <input type="file" multiple ref={fileInputRef}
              onChange={e => setSelectedFiles(Array.from(e.target.files))}
              className="file:uppercase file:rounded-lg file:border-gray-600 hover:file:shadow-md file:cursor-pointer" />
            {selectedFiles.length > 0 && (
              <p className="text-xs text-gray-500">{selectedFiles.length} file(s) selected</p>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="border border-gray-600 rounded-lg px-4 py-1 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[110px]"
              >
                {isSubmitting ? "Saving..." : editingId ? "SAVE CHANGES" : "PUBLISH"}
              </button>
              {editingId && !isSubmitting && (
                <button onClick={resetForm}
                  className="border border-gray-400 rounded-lg px-4 py-1 hover:shadow-md text-gray-500">
                  CANCEL
                </button>
              )}
            </div>

            {articleStatus === "success" && <p className="text-green-600">{editingId ? "Article updated!" : "Article published!"}</p>}
            {articleStatus === "error" && <p className="text-red-500">Something went wrong. Please try again.</p>}
          </div>

          {/* Existing articles */}
          {articles.length > 0 && (
            <div className="max-w-2xl mx-auto mt-10 px-4 pb-10">
              <h2 className="text-xl text-center mb-4 text-gray-600">Published Articles</h2>
              <div className="flex flex-col gap-4">
                {articles.map(article => (
                  <div key={article.id}
                    className={`border rounded-lg p-4 shadow-sm ${article.hidden ? "bg-gray-50 border-gray-200 opacity-60" : "bg-white border-gray-200"}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{article.titleEn}</p>
                          {article.hidden && (
                            <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">Hidden</span>
                          )}
                        </div>
                        {article.titleSr && <p className="text-sm text-gray-500">{article.titleSr}</p>}

                        {/* Image thumbnails */}
                        {article.images?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {article.images.map((url, i) => {
                              const key = `${article.id}-${i}`;
                              const isDeleting = deletingImage === key;
                              return (
                                <div key={i} className="relative group">
                                  <img src={url} alt="" className={`h-16 w-16 object-cover rounded ${isDeleting ? 'opacity-30' : ''}`} />
                                  {isDeleting ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-xs text-gray-500">...</span>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleDeleteImage(article.id, i)}
                                      className="absolute -top-1 -right-1 bg-white border border-gray-300 rounded-full w-4 h-4 text-xs text-red-500 hidden group-hover:flex items-center justify-center"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={async () => {
                            if (togglingId === article.id) return;
                            setTogglingId(article.id);
                            try {
                              await apiClient.togglePressVisibility(article.id);
                              loadData();
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setTogglingId(null);
                            }
                          }}
                          disabled={togglingId === article.id}
                          className="text-sm border border-gray-400 rounded px-3 py-1 hover:shadow-md text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed min-w-[50px]"
                        >
                          {togglingId === article.id ? "..." : article.hidden ? "Show" : "Hide"}
                        </button>
                        <button onClick={() => handleEdit(article)}
                          className="text-sm border border-gray-400 rounded px-3 py-1 hover:shadow-md">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          disabled={deletingId === article.id}
                          className="text-gray-500 hover:text-red-500 border border-gray-300 rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed min-w-[34px]"
                        >
                          {deletingId === article.id ? "..." : <IoTrashOutline />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* YouTube videos section */}
      {activeSection === "videos" && (
        <div className="max-w-2xl mx-auto px-4 pb-10">
          {/* Add new video */}
          <div className="bg-gray-100 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-600 mb-4">Add YouTube Video</h2>
            <label className="text-gray-500 text-sm">VIDEO URL OR ID</label>
            <div className="flex gap-2 mt-1">
              <input
                value={newVideoInput}
                onChange={e => setNewVideoInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or video ID"
                className="flex-1 border border-gray-400 px-2 rounded-lg"
                onKeyDown={e => e.key === "Enter" && handleAddVideo()}
              />
              <button onClick={handleAddVideo}
                disabled={isAddingVideo}
                className="border border-gray-600 rounded-lg px-4 py-1 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[60px]">
                {isAddingVideo ? "..." : "ADD"}
              </button>
            </div>
            {videoStatus === "success" && <p className="text-green-600 mt-2">Video added!</p>}
            {videoStatus === "error" && <p className="text-red-500 mt-2">Something went wrong.</p>}
          </div>

          {/* Current videos */}
          <h2 className="text-xl text-center mb-4 text-gray-600">Current Videos ({videoIds.length})</h2>
          <div className="flex flex-col gap-3">
            {videoIds.map((id, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 shadow-sm">
                <img
                  src={`https://img.youtube.com/vi/${id}/default.jpg`}
                  alt={id}
                  className="h-12 w-20 object-cover rounded"
                />
                <a
                  href={`https://www.youtube.com/watch?v=${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-blue-400 hover:underline truncate"
                >
                  {`youtube.com/watch?v=${id}`}
                </a>
                <button
                  onClick={() => handleRemoveVideo(index)}
                  disabled={removingVideoIndex === index}
                  className="text-gray-500 hover:text-red-500 border border-gray-300 rounded px-2 py-1 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed min-w-[34px]">
                  {removingVideoIndex === index ? '...' : <IoTrashOutline />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AddPress;
