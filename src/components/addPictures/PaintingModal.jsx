import React, { useState, useEffect, useRef } from "react";
import apiClient from "../../services/apiClient";
import { handleUpdateMataData } from "../../helper_functions/aws_helper_functions";

function PaintingModal({ isOpen, onClose, mode, existingImage, onSuccess }) {
  const fileInputRef = useRef(null);

  // File (upload only)
  const [selectedFile, setSelectedFile] = useState(null);

  // Core fields
  const [naslovSlike, setNaslovSlike] = useState("");
  const [pictureName, setPictureName] = useState("");
  const [dimX, setDimX] = useState("");
  const [dimY, setDimY] = useState("");

  // Descriptions
  const [description, setDescription] = useState("");
  const [descriptionSrb, setDescriptionSrb] = useState("");

  // SEO EN
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [altText, setAltText] = useState("");
  const [keywords, setKeywords] = useState("");

  // SEO SR
  const [seoTitleSrb, setSeoTitleSrb] = useState("");
  const [metaDescriptionSrb, setMetaDescriptionSrb] = useState("");
  const [altTextSrb, setAltTextSrb] = useState("");
  const [keywordsSrb, setKeywordsSrb] = useState("");

  // Shareable URL slug
  const [slug, setSlug] = useState("");
  const slugManuallyEdited = useRef(false);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const generateSlug = (title) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Auto-populate slug from title in upload mode (unless manually edited)
  useEffect(() => {
    if (mode === "upload" && !slugManuallyEdited.current) {
      setSlug(generateSlug(pictureName));
    }
  }, [pictureName, mode]);

  // Pre-fill fields in edit mode
  useEffect(() => {
    if (mode === "edit" && existingImage?.metadata) {
      const m = existingImage.metadata;
      setPictureName(m.title || "");
      setNaslovSlike(m.titlesrb ? decodeURIComponent(m.titlesrb) : "");
      setDimX(m.x_dim || "");
      setDimY(m.y_dim || "");
      setDescription(m.description || "");
      setDescriptionSrb(m.descriptionsrb ? decodeURIComponent(m.descriptionsrb) : "");
      setSeoTitle(m.seotitle || "");
      setMetaDescription(m.metadescription || "");
      setAltText(m.alttext || "");
      setKeywords(m.keywords || "");
      setSeoTitleSrb(m.seotitlesrb || "");
      setMetaDescriptionSrb(m.metadescriptionsrb || "");
      setAltTextSrb(m.alttextsrb || "");
      setKeywordsSrb(m.keywordssrb || "");
      setSlug(m.slug || generateSlug(m.title || ""));
    }
  }, [mode, existingImage]);

  const resetFields = () => {
    setSelectedFile(null);
    setPictureName("");
    setNaslovSlike("");
    setDimX("");
    setDimY("");
    setDescription("");
    setDescriptionSrb("");
    setSeoTitle("");
    setMetaDescription("");
    setAltText("");
    setKeywords("");
    setSeoTitleSrb("");
    setMetaDescriptionSrb("");
    setAltTextSrb("");
    setKeywordsSrb("");
    setSlug("");
    slugManuallyEdited.current = false;
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    if (mode === "upload") {
      if (!selectedFile) { setErrorMessage("Please select an image file."); return; }
      if (!pictureName.trim()) { setErrorMessage("Please enter a title (EN)."); return; }
      if (!naslovSlike.trim()) { setErrorMessage("Please enter a Serbian title (Naslov)."); return; }
      if (!dimX || !dimY || isNaN(dimX) || isNaN(dimY)) { setErrorMessage("Please enter valid numeric dimensions."); return; }
      if (parseInt(dimX) <= 0 || parseInt(dimY) <= 0) { setErrorMessage("Dimensions must be positive numbers."); return; }

      setIsSubmitting(true);
      try {
        const result = await apiClient.uploadImage(
          selectedFile,
          pictureName,
          naslovSlike,
          dimX,
          dimY,
          description,
          encodeURIComponent(descriptionSrb),
          seoTitle,
          metaDescription,
          altText,
          keywords,
          seoTitleSrb,
          metaDescriptionSrb,
          altTextSrb,
          keywordsSrb,
          slug
        );
        resetFields();
        onSuccess(result);
      } catch (error) {
        console.error("Upload error:", error);
        setErrorMessage("Upload failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // edit mode
      const m = existingImage.metadata;
      const newMetadata = {
        title: pictureName,
        titlesrb: encodeURIComponent(naslovSlike),
        x_dim: dimX,
        y_dim: dimY,
        description: description,
        descriptionsrb: encodeURIComponent(descriptionSrb),
        seotitle: seoTitle,
        metadescription: metaDescription,
        alttext: altText,
        keywords: keywords,
        seotitlesrb: seoTitleSrb,
        metadescriptionsrb: metaDescriptionSrb,
        alttextsrb: altTextSrb,
        keywordssrb: keywordsSrb,
        slug: slug,
        // Preserve existing fields
        reserved: m.reserved || "false",
        sold: m.sold || "false",
        deleted: m.deleted || "false",
        uploadedat: m.uploadedat || m.uploadedAt || ""
      };

      setIsSubmitting(true);
      try {
        await handleUpdateMataData(existingImage.url, newMetadata);
        onSuccess(newMetadata);
        handleClose();
      } catch (error) {
        console.error("Save error:", error);
        setErrorMessage("Failed to save. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-60 overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        <h2 className="text-lg font-semibold uppercase tracking-wide text-gray-700 mb-5">
          {mode === "upload" ? "Add New Painting" : "Edit Painting"}
        </h2>

        {/* File picker — upload only */}
        {mode === "upload" && (
          <div className="mb-4">
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Image File</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="file:uppercase file:rounded-lg file:border file:border-gray-600 file:px-3 file:py-1 file:cursor-pointer file:text-sm hover:file:shadow-md"
            />
          </div>
        )}

        {/* NASLOV / TITLE / DIMENSIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Naslov (SR)</label>
            <input
              type="text"
              value={naslovSlike}
              onChange={(e) => setNaslovSlike(e.target.value)}
              placeholder="Naslov slike..."
              className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Title (EN)</label>
            <input
              type="text"
              value={pictureName}
              onChange={(e) => setPictureName(e.target.value)}
              placeholder="Picture title..."
              className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Dimensions (cm)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={dimX}
                onChange={(e) => setDimX(e.target.value)}
                placeholder="X"
                className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm text-center"
              />
              <input
                type="number"
                value={dimY}
                onChange={(e) => setDimY(e.target.value)}
                placeholder="Y"
                className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm text-center"
              />
            </div>
          </div>
        </div>

        {/* Descriptions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Description (EN)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description in English..."
              className="border border-gray-300 px-3 py-2 rounded-lg w-full resize-y text-sm"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Opis (SR)</label>
            <textarea
              value={descriptionSrb}
              onChange={(e) => setDescriptionSrb(e.target.value)}
              placeholder="Opis na srpskom..."
              className="border border-gray-300 px-3 py-2 rounded-lg w-full resize-y text-sm"
              rows={3}
            />
          </div>
        </div>

        {/* SEO Section */}
        <div className="border-t border-gray-200 pt-4 mt-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">SEO Data (Google)</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                SEO Title EN <span className="text-gray-400">({seoTitle.length}/60)</span>
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                maxLength={60}
                placeholder="Title shown in Google search..."
                className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                SEO Title SR <span className="text-gray-400">({seoTitleSrb.length}/60)</span>
              </label>
              <input
                type="text"
                value={seoTitleSrb}
                onChange={(e) => setSeoTitleSrb(e.target.value)}
                maxLength={60}
                placeholder="Naslov u Google pretrazi..."
                className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Meta Description EN <span className="text-gray-400">({metaDescription.length}/160)</span>
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={160}
                placeholder="Description shown in Google results..."
                className="border border-gray-300 px-3 py-2 rounded-lg w-full resize-y text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Meta Description SR <span className="text-gray-400">({metaDescriptionSrb.length}/160)</span>
              </label>
              <textarea
                value={metaDescriptionSrb}
                onChange={(e) => setMetaDescriptionSrb(e.target.value)}
                maxLength={160}
                placeholder="Opis u Google rezultatima..."
                className="border border-gray-300 px-3 py-2 rounded-lg w-full resize-y text-sm"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Alt Text EN</label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image for accessibility..."
                className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Alt Text SR</label>
              <input
                type="text"
                value={altTextSrb}
                onChange={(e) => setAltTextSrb(e.target.value)}
                placeholder="Opis slike za pristupacnost..."
                className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Keywords EN <span className="text-gray-400">(comma-separated)</span></label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="watercolor, portrait, Belgrade..."
                className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Keywords SR <span className="text-gray-400">(odvojene zarezom)</span></label>
              <input
                type="text"
                value={keywordsSrb}
                onChange={(e) => setKeywordsSrb(e.target.value)}
                placeholder="akvarela, portret, Beograd..."
                className="border border-gray-300 px-3 py-2 rounded-lg w-full text-sm"
              />
            </div>
          </div>
        </div>

        {/* Shareable URL */}
        {(
          <div className="border-t border-gray-200 pt-4 mt-2">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Shareable URL</p>
            <div className="flex gap-2 items-center mb-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => { slugManuallyEdited.current = true; setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
                placeholder="painting-slug-url"
                className="border border-gray-300 px-3 py-2 rounded-lg flex-1 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setSlug(generateSlug(pictureName))}
                className="text-xs border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap"
              >
                ↻ Generate
              </button>
            </div>
            {slug && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-400 font-mono truncate">
                  dusandjukaric.com/gallery/<span className="text-gray-600">{slug}</span>
                </p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(`https://dusandjukaric.com/gallery/${slug}`)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {errorMessage && (
          <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
        )}

        {/* Submit */}
        <div className="flex justify-end mt-5">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="border border-gray-600 rounded-lg px-6 py-2 hover:shadow-md uppercase tracking-wide text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? mode === "upload" ? "UPLOADING..." : "SAVING..."
              : mode === "upload" ? "UPLOAD" : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaintingModal;
