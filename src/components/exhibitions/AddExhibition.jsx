import React, { useState, useRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import apiClient from "../../services/apiClient";
import { IoTrashOutline } from "react-icons/io5";

const formatDate = (date) => {
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const parseDate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

function AddExhibition() {
  const [exhibitions, setExhibitions] = useState([]);
  const [form, setForm] = useState({
    titleEn: "", titleSr: "",
    openingTime: "",
    locationEn: "", locationSr: "", locationUrl: "",
    noteEn: "", noteSr: "",
  });
  const [dateStart, setDateStart] = useState(null);
  const [dateEnd, setDateEnd] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  const loadExhibitions = () => {
    apiClient.getExhibitions(true)
      .then(data => setExhibitions(data.exhibitions || []))
      .catch(err => console.error('Failed to load exhibitions:', err));
  };

  useEffect(() => { loadExhibitions(); }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setForm({
      titleEn: "", titleSr: "",
      openingTime: "",
      locationEn: "", locationSr: "", locationUrl: "",
      noteEn: "", noteSr: "",
    });
    setDateStart(null);
    setDateEnd(null);
    setSelectedFile(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = (ex) => {
    setEditingId(ex.id);
    setForm({
      titleEn: ex.titleEn || "",
      titleSr: ex.titleSr || "",
      openingTime: ex.openingTime || "",
      locationEn: ex.locationEn || "",
      locationSr: ex.locationSr || "",
      locationUrl: ex.locationUrl || "",
      noteEn: ex.noteEn || "",
      noteSr: ex.noteSr || "",
    });
    setDateStart(parseDate(ex.dateStart));
    setDateEnd(parseDate(ex.dateEnd));
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!form.titleEn.trim() || !dateStart) {
      alert("Title (EN) and start date are required.");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    formData.append("dateStart", formatDate(dateStart));
    formData.append("dateEnd", formatDate(dateEnd));
    if (selectedFile) formData.append("image", selectedFile);

    setIsSubmitting(true);
    try {
      if (editingId) {
        await apiClient.updateExhibition(editingId, formData);
      } else {
        await apiClient.createExhibition(formData);
      }
      resetForm();
      loadExhibitions();
      setStatus("success");
    } catch (err) {
      console.error("Exhibition save error:", err);
      setStatus("error");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this exhibition?")) return;
    setDeletingId(id);
    try {
      await apiClient.deleteExhibition(id);
      loadExhibitions();
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl text-center py-4">
        {editingId ? "Edit Exhibition" : "Add Exhibition"}
      </h1>

      <div className="w-2/3 max-w-2xl bg-gray-100 flex flex-col gap-2 mx-auto rounded-lg p-6">
        <label className="text-gray-500 text-sm">TITLE (EN)</label>
        <input name="titleEn" value={form.titleEn} onChange={handleChange}
          placeholder="Exhibition title..." className="border border-gray-400 px-2 rounded-lg" />

        <label className="text-gray-500 text-sm">NASLOV (SR)</label>
        <input name="titleSr" value={form.titleSr} onChange={handleChange}
          placeholder="Naziv izložbe..." className="border border-gray-400 px-2 rounded-lg" />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-gray-500 text-sm">DATE START</label>
            <DatePicker
              selected={dateStart}
              onChange={(date) => setDateStart(date)}
              selectsStart
              startDate={dateStart}
              endDate={dateEnd}
              placeholderText="Select start date"
              dateFormat="dd MMMM yyyy"
              className="w-full border border-gray-400 px-2 rounded-lg"
            />
          </div>
          <div>
            <label className="text-gray-500 text-sm">DATE END</label>
            <DatePicker
              selected={dateEnd}
              onChange={(date) => setDateEnd(date)}
              selectsEnd
              startDate={dateStart}
              endDate={dateEnd}
              minDate={dateStart}
              placeholderText="Select end date"
              dateFormat="dd MMMM yyyy"
              className="w-full border border-gray-400 px-2 rounded-lg"
            />
          </div>
        </div>

        <label className="text-gray-500 text-sm">OPENING TIME</label>
        <input name="openingTime" value={form.openingTime} onChange={handleChange}
          placeholder="e.g. 18:00 h" className="border border-gray-400 px-2 rounded-lg" />

        <label className="text-gray-500 text-sm">LOCATION (EN)</label>
        <input name="locationEn" value={form.locationEn} onChange={handleChange}
          placeholder="Gallery name, address..." className="border border-gray-400 px-2 rounded-lg" />

        <label className="text-gray-500 text-sm">LOKACIJA (SR)</label>
        <input name="locationSr" value={form.locationSr} onChange={handleChange}
          placeholder="Naziv galerije, adresa..." className="border border-gray-400 px-2 rounded-lg" />

        <label className="text-gray-500 text-sm">LOCATION URL (Google Maps link)</label>
        <input name="locationUrl" value={form.locationUrl} onChange={handleChange}
          placeholder="https://maps.google.com/..." className="border border-gray-400 px-2 rounded-lg" />

        <label className="text-gray-500 text-sm">NOTE (EN)</label>
        <textarea name="noteEn" value={form.noteEn} onChange={handleChange}
          placeholder="Additional notes..." rows={3}
          className="border border-gray-400 px-2 rounded-lg resize-none" />

        <label className="text-gray-500 text-sm">NAPOMENA (SR)</label>
        <textarea name="noteSr" value={form.noteSr} onChange={handleChange}
          placeholder="Dodatne napomene..." rows={3}
          className="border border-gray-400 px-2 rounded-lg resize-none" />

        <label className="text-gray-500 text-sm">IMAGE</label>
        <input type="file" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files[0])}
          className="file:uppercase file:rounded-lg file:border-gray-600 hover:file:shadow-md file:cursor-pointer" />

        <div className="flex gap-2 mt-2">
          <button onClick={handleSubmit}
            disabled={isSubmitting}
            className="border border-gray-600 rounded-lg px-4 py-1 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[110px]">
            {isSubmitting ? "Saving..." : editingId ? "SAVE CHANGES" : "PUBLISH"}
          </button>
          {editingId && !isSubmitting && (
            <button onClick={resetForm}
              className="border border-gray-400 rounded-lg px-4 py-1 hover:shadow-md text-gray-500">
              CANCEL
            </button>
          )}
        </div>

        {status === "success" && (
          <p className="text-green-600">{editingId ? "Exhibition updated!" : "Exhibition published!"}</p>
        )}
        {status === "error" && (
          <p className="text-red-500">Something went wrong. Please try again.</p>
        )}
      </div>

      {/* Existing exhibitions list */}
      {exhibitions.length > 0 && (
        <div className="max-w-2xl mx-auto mt-10 px-4">
          <h2 className="text-xl text-center mb-4 text-gray-600">Published Exhibitions</h2>
          <div className="flex flex-col gap-4">
            {exhibitions.map(ex => (
              <div key={ex.id} className={`border rounded-lg p-4 flex justify-between items-start shadow-sm ${ex.hidden ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{ex.titleEn}</p>
                    {ex.hidden && (
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">Hidden</span>
                    )}
                  </div>
                  {ex.titleSr && <p className="text-sm text-gray-500">{ex.titleSr}</p>}
                  <p className="text-sm text-gray-400 mt-1">
                    {ex.dateStart}{ex.dateEnd ? ` – ${ex.dateEnd}` : ""}
                  </p>
                  {ex.imageUrl && (
                    <img src={ex.imageUrl} alt={ex.titleEn}
                      className="mt-2 h-20 w-auto object-cover rounded" />
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={async () => {
                      if (togglingId === ex.id) return;
                      setTogglingId(ex.id);
                      try {
                        await apiClient.toggleExhibitionVisibility(ex.id);
                        loadExhibitions();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setTogglingId(null);
                      }
                    }}
                    disabled={togglingId === ex.id}
                    className="text-sm border border-gray-400 rounded px-3 py-1 hover:shadow-md text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed min-w-[50px]"
                  >
                    {togglingId === ex.id ? '...' : ex.hidden ? 'Show' : 'Hide'}
                  </button>
                  <button onClick={() => handleEdit(ex)}
                    className="text-sm border border-gray-400 rounded px-3 py-1 hover:shadow-md">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(ex.id)}
                    disabled={deletingId === ex.id}
                    className="text-gray-500 hover:text-red-500 border border-gray-300 rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed min-w-[34px]">
                    {deletingId === ex.id ? '...' : <IoTrashOutline />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AddExhibition;
