import React, { useState } from "react";
import Filter from "../gallery/Filter";
import AddExhibition from "../exhibitions/AddExhibition";
import AddPress from "../press/AddPress";
import PaintingModal from "./PaintingModal";

function AddPictures() {
  const [activeTab, setActiveTab] = useState("paintings");
  const [infoDismissed, setInfoDismissed] = useState(false);
  const [addNewPicture, setAddNewPicture] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <div>
      {/* Info banner */}
      {!infoDismissed && (
        <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between">
          <div className="text-sm text-blue-800">
            <strong>Note:</strong> The server runs on Vercel serverless functions, which may restart between requests (cold starts). If any action returns a login error or stops working, simply <strong>log out and log back in</strong> to restore your session.
          </div>
          <button
            onClick={() => setInfoDismissed(true)}
            className="ml-4 text-blue-400 hover:text-blue-600 text-lg leading-none flex-shrink-0"
            aria-label="Dismiss notice"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center border-b border-gray-200 mt-6 mb-8">
        <button
          onClick={() => setActiveTab("paintings")}
          className={`px-8 py-3 text-sm font-medium transition-colors ${
            activeTab === "paintings"
              ? "border-b-2 border-gray-700 text-gray-700"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Manage Paintings
        </button>
        <button
          onClick={() => setActiveTab("exhibitions")}
          className={`px-8 py-3 text-sm font-medium transition-colors ${
            activeTab === "exhibitions"
              ? "border-b-2 border-gray-700 text-gray-700"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Manage Exhibitions
        </button>
        <button
          onClick={() => setActiveTab("press")}
          className={`px-8 py-3 text-sm font-medium transition-colors ${
            activeTab === "press"
              ? "border-b-2 border-gray-700 text-gray-700"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Manage Press
        </button>
      </div>

      {/* Paintings tab */}
      {activeTab === "paintings" && (
        <div>
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setShowUploadModal(true)}
              className="border border-gray-600 rounded-lg px-6 py-2 hover:shadow-md uppercase tracking-wide"
            >
              + Add New Painting
            </button>
          </div>
          <div className="flex flex-col items-center py-6">
            <Filter isAdmin={true} addedNewPicture={addNewPicture} />
          </div>
          <PaintingModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            mode="upload"
            onSuccess={() => {
              setAddNewPicture(Date.now());
              setShowUploadModal(false);
            }}
          />
        </div>
      )}

      {/* Exhibitions tab */}
      {activeTab === "exhibitions" && <AddExhibition />}

      {/* Press tab */}
      {activeTab === "press" && <AddPress />}
    </div>
  );
}

export default AddPictures;
