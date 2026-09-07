import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ShowPopup from "./ShowPopUp";
import apiClient from "../../services/apiClient";
import {
  reserveImage,
  deleteImage,
} from "../../helper_functions/aws_helper_functions";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import Modal from "react-modal";
import { IoMailOutline } from "react-icons/io5";
import { IoTrashOutline } from "react-icons/io5";
import { GoPencil } from "react-icons/go";
import { IoAttach } from "react-icons/io5";
import PaintingModal from "../addPictures/PaintingModal";

// Detect TV browsers by user-agent — Tizen (Samsung), webOS (LG), HbbTV, Android TV, etc.
// Computed once at module load so it never causes re-renders.
const isTVBrowser = /Tizen|webOS|Web0S|SmartTV|SMART-TV|HbbTV|NetCast|NETTV|CrKey|Maple|\bTV\b/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : ''
);

const generateSlug = (title) =>
  (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const getPaintingUrlId = (url, metadata) => {
  const timestampId = url.split('/').pop().split('.')[0];
  const baseSlug = metadata.slug || generateSlug(metadata.title);
  if (!baseSlug) return timestampId;
  return `${baseSlug}-${timestampId}`;
};

const findPaintingByUrlId = (paintingId, allImages) => {
  // Pure timestamp ID (old-style links)
  if (/^\d+$/.test(paintingId)) {
    return allImages.find(img => img.url.split('/').pop().split('.')[0] === paintingId);
  }

  // slug-TIMESTAMP format (e.g. "venice-8212509425840")
  const timestampSuffixMatch = paintingId.match(/^.+-(\d{10,})$/);
  if (timestampSuffixMatch) {
    const tsId = timestampSuffixMatch[1];
    return allImages.find(img => img.url.split('/').pop().split('.')[0] === tsId);
  }

  // Fallback: plain slug match (for any old links without timestamp)
  return allImages.find(img =>
    img.metadata.slug === paintingId || generateSlug(img.metadata.title) === paintingId
  );
};

// Pure utility functions — defined outside to avoid recreation on every render
const sortByUploadTime = (images) => {
  const getTime = (img) => {
    const uploadedAt = img.metadata?.uploadedAt || img.metadata?.uploadedat;
    if (uploadedAt) return new Date(uploadedAt).getTime();
    if (img.key) {
      const ts = parseInt(img.key.split('/').pop().split('.')[0]);
      if (!isNaN(ts) && ts > 0) return ts;
    }
    return new Date(img.lastModified).getTime();
  };
  return [...images].sort((a, b) => getTime(b) - getTime(a));
};

const getTitleForLanguage = (lang, metadata) => {
  if (lang === "eng" || lang === "en") {
    return metadata["title"];
  }
  return decodeURIComponent(metadata["titlesrb"]);
};

/**
 * ImgGallery component - Main gallery display component
 * Handles image display, filtering, admin functions, and user interactions
 */

function ImgGallery({
  filter,
  searchTerm,
  isAdmin,
  addedNewPicture,
  chosenLanguage,
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { paintingId } = useParams();
  const autoOpenedRef = useRef(false);
  const scrollPositionRef = useRef(0);
  // UI State
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showPopup, setShowPopup] = useState(false);
  const [sawPopup, setSawPopup] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stillSearching, setStillSearching] = useState(false);

  // Image Data State
  const [imagesView, setImagesView] = useState([]);
  const [availablePictures, setAvailablePictures] = useState([]);
  const [soldPictures, setSoldPictures] = useState([]);
  const [allAvailablePicturesLoaded, setAllAvailablePicturesLoaded] = useState(false);
  const [allSoldPicturesLoaded, setAllSoldPicturesLoaded] = useState(false);
  
  // Pagination State
  const [availableContinuationToken, setAvailableContinuationToken] = useState(null);
  const [soldContinuationToken, setSoldContinuationToken] = useState(null);

  // Refs so loadMorePictures can read the latest token without being a dep
  const availableTokenRef = useRef(null);
  const soldTokenRef = useRef(null);
  useEffect(() => { availableTokenRef.current = availableContinuationToken; }, [availableContinuationToken]);
  useEffect(() => { soldTokenRef.current = soldContinuationToken; }, [soldContinuationToken]);

  // Infinite scroll sentinel + fetch guard
  const sentinelRef = useRef(null);
  const isFetchingRef = useRef(false);
  // Blocks loadMorePictures while fetchImages is running (prevents concurrent page-1 fetches)
  const isFetchingInitialRef = useRef(false);
  // Stable ref to loadMorePictures so the showPopup effect doesn't re-fire on filter change
  const loadMorePicturesRef = useRef(null);

  // Editing State
  const [editingModalImage, setEditingModalImage] = useState(null);

  // Metadata State
  const [changedMetadata, setChangedMetadata] = useState(false);
  const [clickedMarkAsSold, setClickedMarkAsSold] = useState(null);

  // Per-image action loading states
  const [movingImageUrl, setMovingImageUrl] = useState(null);
  const [reservingImageUrl, setReservingImageUrl] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal State
  const [deleteIsOpen, setDeleteIsOpen] = useState(false);
  const [deleteImageInfo, setDeleteImageInfo] = useState(null);

  const loadMorePictures = useCallback(async () => {
    if (isFetchingRef.current || isFetchingInitialRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const continuationToken = filter === "available"
        ? availableTokenRef.current
        : soldTokenRef.current;

      const response = await apiClient.getImages(filter, continuationToken);

      if (response && response.images) {
        const newImages = response.images.map(img => ({
          url: img.url || `https://ddjpictures.s3.amazonaws.com/${img.Key}`,
          key: img.Key,
          lastModified: img.LastModified,
          size: img.Size,
          metadata: img.metadata || {}
        }));

        if (filter === "available") {
          setAvailablePictures(prev => sortByUploadTime([...prev, ...newImages]));
          setAvailableContinuationToken(response.continuationToken);
          setAllAvailablePicturesLoaded(!response.hasMore);
        } else if (filter === "sold") {
          setSoldPictures(prev => sortByUploadTime([...prev, ...newImages]));
          setSoldContinuationToken(response.continuationToken);
          setAllSoldPicturesLoaded(!response.hasMore);
        }
      }
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [filter]);

  const fetchImages = async (fromBeginning) => {
    isFetchingInitialRef.current = true;
    setLoading(true);
    try {
      // Fetch available images
      const availableResponse = await apiClient.getImages("available", null, 25, fromBeginning);
      if (availableResponse && availableResponse.images) {
        const availableImages = availableResponse.images.map(img => ({
          url: img.url || `https://ddjpictures.s3.amazonaws.com/${img.Key}`,
          key: img.Key,
          lastModified: img.LastModified,
          size: img.Size,
          metadata: img.metadata || {}
        }));
        
        const sortedAvailableImages = sortByUploadTime(availableImages);
        
        setAvailablePictures(sortedAvailableImages);
        setAvailableContinuationToken(availableResponse.continuationToken);
        setAllAvailablePicturesLoaded(!availableResponse.hasMore);
      }

      // Fetch sold images
      const soldResponse = await apiClient.getImages("sold", null, 25, fromBeginning);
      if (soldResponse && soldResponse.images) {
        const soldImages = soldResponse.images.map(img => ({
          url: img.url || `https://ddjpictures.s3.amazonaws.com/${img.Key}`,
          key: img.Key,
          lastModified: img.LastModified,
          size: img.Size,
          metadata: img.metadata || {}
        }));

        const sortedSoldImages = sortByUploadTime(soldImages);

        setSoldPictures(sortedSoldImages);
        setSoldContinuationToken(soldResponse.continuationToken);
        setAllSoldPicturesLoaded(!soldResponse.hasMore);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
      isFetchingInitialRef.current = false;
    }
  };

  // Keep the ref current so the showPopup effect always calls the latest version
  useEffect(() => { loadMorePicturesRef.current = loadMorePictures; }, [loadMorePictures]);

  // After closing a popup, load more images — but don't re-fire just because filter changed
  useEffect(() => {
    if (!showPopup && sawPopup) {
      loadMorePicturesRef.current?.();
    }
  }, [showPopup, sawPopup]); // intentionally excludes loadMorePictures — use the ref instead

  // Handle filter changes - update imagesView based on current filter
  // availablePictures/soldPictures are already sorted when stored, no re-sort needed
  useEffect(() => {
    if (filter === "available") {
      setImagesView(availablePictures);
    } else if (filter === "sold") {
      setImagesView(soldPictures);
    }
  }, [filter, availablePictures, soldPictures]);

  // Infinite scroll: trigger loadMorePictures when sentinel enters the viewport
  useEffect(() => {
    const allLoaded = filter === "available" ? allAvailablePicturesLoaded : allSoldPicturesLoaded;
    if (allLoaded) return;

    // TV browsers may not support IntersectionObserver — fall back to a scroll listener
    if (!('IntersectionObserver' in window)) {
      const handleScroll = () => {
        if (!sentinelRef.current || isFetchingRef.current) return;
        const rect = sentinelRef.current.getBoundingClientRect();
        if (rect.top <= window.innerHeight + 200) {
          loadMorePictures();
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingRef.current) {
          loadMorePictures();
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filter, allAvailablePicturesLoaded, allSoldPicturesLoaded, loadMorePictures]);

  const filteredImages = useMemo(() => {
    const clean = (imagesView || []).filter(img => img && typeof img === 'object');
    return clean.filter((img) => {
      if (!img.metadata || !img.metadata.title) return false;
      if (!searchTerm) return true;
      const titleMatch = img.metadata.title.toLowerCase().includes(searchTerm.toLowerCase());
      const serbianTitleMatch = decodeURIComponent(img.metadata.titlesrb || "").toLowerCase().includes(searchTerm.toLowerCase());
      return titleMatch || serbianTitleMatch;
    });
  }, [imagesView, searchTerm]);

  // Handle search state
  useEffect(() => {
    const isSearching = (!allAvailablePicturesLoaded || !allSoldPicturesLoaded) &&
      filteredImages?.length === 0 &&
      searchTerm !== "";
    setStillSearching(isSearching);
  }, [searchTerm, allAvailablePicturesLoaded, allSoldPicturesLoaded, filteredImages]);

  useEffect(() => {
    if (addedNewPicture) {
      fetchImages(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addedNewPicture]);

  useEffect(() => {
    if (clickedMarkAsSold) {
      // Find the moved image in the current section
      const movedImage = availablePictures?.find(img => img.url === clickedMarkAsSold) || 
                        soldPictures?.find(img => img.url === clickedMarkAsSold);
      
      if (movedImage) {
        if (filter === "available") {
          // Moving from available to sold
          const newAvailablePictures = availablePictures?.filter(
            (img) => img.url !== clickedMarkAsSold
          );
          const newSoldPictures = [{ ...movedImage, metadata: { ...movedImage.metadata, sold: 'true' } }, ...soldPictures];
          
          setAvailablePictures(newAvailablePictures);
          setSoldPictures(newSoldPictures);
        } else {
          // Moving from sold to available
          const newSoldPictures = soldPictures?.filter(
            (img) => img.url !== clickedMarkAsSold
          );
          const newAvailablePictures = [{ ...movedImage, metadata: { ...movedImage.metadata, sold: 'false' } }, ...availablePictures];

          setSoldPictures(newSoldPictures);
          setAvailablePictures(newAvailablePictures);
        }
      }
      setClickedMarkAsSold(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedMetadata]); // intentional: effect reads fresh state values after changedMetadata toggle

  // Auto-open popup when visiting /gallery/:paintingId directly
  useEffect(() => {
    if (!paintingId || autoOpenedRef.current) return;
    const allImages = [...availablePictures, ...soldPictures];
    if (allImages.length === 0) return;

    const match = findPaintingByUrlId(paintingId, allImages);
    if (match) {
      autoOpenedRef.current = true;
      setCurrentImage({ img: match.url, metadata: match.metadata });
      setShowPopup(true);
      document.body.style.overflow = "hidden";
    }
  }, [availablePictures, soldPictures, paintingId]);

  // Fetch painting directly on mount when URL contains a paintingId —
  // runs in parallel with gallery loading so deep paintings open immediately
  useEffect(() => {
    if (!paintingId || isAdmin) return;

    const timestampMatch = paintingId.match(/^.+-(\d{10,})$/);
    const timestampId = timestampMatch ? timestampMatch[1] : (/^\d+$/.test(paintingId) ? paintingId : null);
    if (!timestampId) return;

    apiClient.getPaintingById(timestampId)
      .then(painting => {
        if (autoOpenedRef.current) return; // already opened by local search
        autoOpenedRef.current = true;
        setCurrentImage({ img: painting.url, metadata: painting.metadata });
        setShowPopup(true);
        document.body.style.overflow = "hidden";
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount only

  // Initialize gallery and handle window resize
  useEffect(() => {
    fetchImages();

    const handleWindowResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchImages intentionally omitted — run once on mount only

  const handleOpenPopup = (event, img, metadata) => {
    if (event.target.tagName === "IMG") {
      scrollPositionRef.current = window.scrollY;
      setCurrentImage({ img, metadata });
      setShowPopup(true);
      setSawPopup(false);
      document.body.style.overflow = "hidden";
      if (!isAdmin) {
        const urlId = getPaintingUrlId(img, metadata);
        navigate(`/gallery/${urlId}`, { replace: false });
      }
    }
  };

  const handleEditImage = (url, metadata) => {
    setEditingModalImage({ url, metadata });
  };

  const handleClosePopup = () => {
    setCurrentImage(null);
    setShowPopup(false);
    setSawPopup(true);
    document.body.style.overflow = "auto";
    if (!isAdmin) {
      navigate('/gallery', { replace: true });
    }
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current);
    });
  };

  // Intercept back button while popup is open — same behaviour as pressing X
  useEffect(() => {
    if (!showPopup || isAdmin) return;

    const handlePopState = () => {
      setCurrentImage(null);
      setShowPopup(false);
      setSawPopup(true);
      document.body.style.overflow = "auto";
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showPopup, isAdmin]);

  const handleSendRequest = (img, title) => {
    const subject = `Request for ${title}`;
    const mailtoURL = `mailto:dusandjukaric@yahoo.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(img)}`;

    window.open(mailtoURL);
  };

  const handlePopupClick = (event) => {
    if (event.target.classList.contains("popup-image")) {
      event.stopPropagation();
    } else {
      handleClosePopup();
    }
  };

  // Admin button components
  const showEditButton = (url, metadata) => {
    if (!isAdmin) return null;
    
    return (
      <button
        className="hover:shadow-md px-2 rounded transition-colors"
        onClick={() => handleEditImage(url, metadata)}
        aria-label="Edit image"
      >
        <GoPencil />
      </button>
    );
  };

  const showDeleteButton = (url, metadata) => {
    if (!isAdmin) return null;
    
    return (
      <button
        className="hover:shadow-md px-2 rounded transition-colors"
        onClick={() => {
          setDeleteIsOpen(true);
          setDeleteImageInfo({ url, metadata });
        }}
        aria-label="Delete image"
      >
        <IoTrashOutline />
      </button>
    );
  };

  const showReserveButton = (url, metadata) => {
    if (!isAdmin) return null;
    const isReserving = reservingImageUrl === url;

    return (
      <button
        className={`hover:shadow-md px-2 rounded transition-colors ${isReserving ? 'opacity-40 cursor-not-allowed' : ''}`}
        disabled={isReserving}
        onClick={async () => {
          if (isReserving) return;
          setReservingImageUrl(url);
          try {
            await reserveImage(url, metadata);

            // Update local state immediately
            const newReservedStatus = metadata.reserved === 'true' ? 'false' : 'true';
            const updatedMetadata = { ...metadata, reserved: newReservedStatus };

            // Update the appropriate state arrays
            if (filter === "available") {
              const updatedAvailablePictures = availablePictures?.map((img) => {
                if (img.url === url) {
                  return { ...img, metadata: updatedMetadata };
                }
                return img;
              });
              setAvailablePictures(updatedAvailablePictures);
            } else {
              const updatedSoldPictures = soldPictures?.map((img) => {
                if (img.url === url) {
                  return { ...img, metadata: updatedMetadata };
                }
                return img;
              });
              setSoldPictures(updatedSoldPictures);
            }
          } catch (error) {
            console.error('Failed to toggle reservation:', error);
          } finally {
            setReservingImageUrl(null);
          }
        }}
        aria-label="Reserve image"
      >
        <IoAttach />
      </button>
    );
  };

  const closeDeleteModal = () => {
    setDeleteIsOpen(false);
  };

  const showButton = (url, metadata) => {
    if (isAdmin) {
      if (filter === 'sold' || metadata?.sold === 'true') {
        const isMoving = movingImageUrl === url;
        return (
          <button
            className={`border border-gray-500 rounded p-2 hover:shadow-md opacity-20 hover:opacity-25 ${isMoving ? 'cursor-not-allowed' : ''}`}
            disabled={isMoving}
            onClick={async () => {
              if (isMoving) return;
              setMovingImageUrl(url);
              try {
                const fileName = url.split('/').pop();
                const s3Key = `sold/${fileName}`;
                await apiClient.moveImage(s3Key, 'available');
                setChangedMetadata(!changedMetadata);
                setClickedMarkAsSold(url);
              } catch (error) {
                console.error('Failed to move image:', error);
              } finally {
                setMovingImageUrl(null);
              }
            }}
          >
            {isMoving ? '...' : 'Mark as Available'}
          </button>
        );
      } else if (filter === 'available' || metadata?.sold !== 'true') {
        const isMoving = movingImageUrl === url;
        return (
          <button
            className={`border border-gray-500 rounded p-2 hover:shadow-md ${isMoving ? 'cursor-not-allowed' : ''}`}
            disabled={isMoving}
            onClick={async () => {
              if (isMoving) return;
              setMovingImageUrl(url);
              try {
                const fileName = url.split('/').pop();
                const s3Key = `available/${fileName}`;
                await apiClient.moveImage(s3Key, 'sold');
                setChangedMetadata(!changedMetadata);
                setClickedMarkAsSold(url);
              } catch (error) {
                console.error('Failed to move image:', error);
              } finally {
                setMovingImageUrl(null);
              }
            }}
          >
            {isMoving ? '...' : 'Mark as Sold'}
          </button>
        );
      }
    }
    return (
      <span
        className="my-auto m-1 rounded px-2 text-[20px] xl:text-[23px] hover:shadow-md hover:bg-neutral-50 transition-all duration-300 ease-in"
        onClick={() => handleSendRequest(url, metadata["title"])}
      >
        {/* SEND REQUEST */}
        {/*<ion-icon name="mail-outline"></ion-icon>*/}
        <IoMailOutline />
      </span>
    );
  };

  function loadingMessage() {
    if (loading) {
      if (stillSearching) {
        return (
          <>
            <p className="text-center text-2xl text-gray-500">
              {t("stillSearching")}
            </p>
            <p className="text-center text-gray-500">{t("pleaseWait")}</p>
          </>
        );
      } else {
        return (
          <>
            <p className="text-center text-2xl text-gray-500">{t("loading")}</p>
            <p className="text-center text-gray-500">{t("pleaseWait")}</p>
          </>
        );
      }
    }
    return (
      <>
        <p className="text-center text-2xl text-gray-500">{t("noResult")}</p>
        <p className="text-center text-gray-500">{t("resultText")}</p>
      </>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 my-10 md:mx-12 lg:mx-20  items-center">
        {filteredImages?.map(({ url, metadata }) => {
          // Add safety check for metadata
          if (!metadata) {
            console.warn('Image missing metadata:', url);
            return null;
          }
          
          return (
            <div
              className="relative"
              key={url}
              onClick={(event) => handleOpenPopup(event, url, metadata)}
            >
              <div className="relative w-full">
                {(filter === 'sold' || metadata?.sold === 'true') && (
                  <div className="absolute top-0 right-0 bg-neutral-50 px-2 border-t border-r border-gray-200 z-10">
                    <p>{t("sold")}</p>
                  </div>
                )}
                {"reserved" in metadata && metadata["reserved"] === "true" && (
                  <div className="absolute top-0 right-0 bg-neutral-50 px-2 border-t border-r border-gray-200 z-10">
                    <p>{t("reserved")}</p>
                  </div>
                )}
                <img
                  src={url}
                  alt={metadata["alttext"] || "Paintings, Watercolor, Dusan Djukaric"}
                  className="w-full shadow-md"
                />
              </div>
              <div className="flex justify-between mt-2">
                <div className="p-1">
                  <p>{getTitleForLanguage(i18n.language, metadata)}</p>
                  <p className="text-[11px] xl:text-[12px] text-gray-500">
                    {t("dimension")} {metadata["x_dim"]} x {metadata["y_dim"]}{" "}
                    {t("cm")}
                  </p>
                  <p className="text-[11px] xl:text-[12px] text-gray-500">
                    {t("technique")}
                  </p>
                  {!isAdmin && !isTVBrowser && (metadata["description"] || metadata["descriptionsrb"]) && (
                    <p className="lg:hidden text-[11px] xl:text-[12px] text-gray-600 mt-1">
                      {(i18n.language === "eng" || i18n.language === "en")
                        ? metadata["description"]
                        : (decodeURIComponent(metadata["descriptionsrb"] || "") || metadata["description"])}
                    </p>
                  )}
                </div>
                {showReserveButton(url, metadata)}
                {showDeleteButton(url, metadata)}
                {showEditButton(url, metadata)}
                {showButton(url, metadata)}
              </div>
            </div>
          );
        })}
      </div>
      <div>
        {filteredImages?.length === 0 && (
          <div className="h-[100px] mb-20">{loadingMessage()}</div>
        )}
      </div>
      <div ref={sentinelRef} className="h-4" />
      {loading && imagesView.length > 0 && (
        <div className="flex flex-col items-center py-6">
          <span className="text-slate-500 animate-spin text-2xl">
            <ion-icon name="reload-outline"></ion-icon>
          </span>
          <p className="text-slate-500 mt-2">{t("loadingPaintings")}</p>
        </div>
      )}
      <ShowPopup
        showPopup={showPopup}
        currentImage={currentImage}
        handleClosePopup={handleClosePopup}
        handleSendRequest={handleSendRequest}
        handlePopupClick={handlePopupClick}
        currentImageArray={filteredImages}
        hideDescription={false}
        onNavigate={(painting) => {
          if (isAdmin) return;
          const urlId = getPaintingUrlId(painting.url, painting.metadata);
          navigate(`/gallery/${urlId}`, { replace: true });
        }}
      />
      {deleteIsOpen && (
        <Modal
          isOpen={deleteIsOpen}
          onRequestClose={closeDeleteModal}
          contentLabel="Delete confirmation"
        >
          <div className="grid grid-col justify-center items-center my-auto">
            <h2 className="mt-10 text-xl text-slate-700">
              Da li ste sigurni da želite da obrišete ovu sliku?
            </h2>
            <p className="mx-auto mt-[100px] mb-10 text-4xl text-slate-700">
              {decodeURIComponent(deleteImageInfo?.metadata["titlesrb"])}
            </p>
            <p className="mx-auto mb-[130px] text-slate-500">
              Ovo je trajna izmena.
            </p>
            <button
              onClick={closeDeleteModal}
              className="text-slate-700 border rounded my-10 py-3 hover:shadow-md hover:bg-slate-200 hover:text-slate-500"
            >
              Zatvori
            </button>
            <button
              className="text-slate-500 border rounded py-3 hover:shadow-md hover:text-slate-700 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isDeleting}
              onClick={async () => {
                if (isDeleting) return;
                setIsDeleting(true);
                try {
                  await deleteImage(deleteImageInfo);

                  // Update local state to remove the deleted image
                  if (filter === "available") {
                    setAvailablePictures(prev => prev.filter(img => img.url !== deleteImageInfo.url));
                  } else {
                    setSoldPictures(prev => prev.filter(img => img.url !== deleteImageInfo.url));
                  }

                  closeDeleteModal();
                } catch (error) {
                  console.error('Failed to delete image:', error);
                  closeDeleteModal();
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? 'BRISANJE...' : 'OBRIŠI SLIKU'}
            </button>
          </div>
        </Modal>
      )}
      {editingModalImage && (
        <PaintingModal
          isOpen={true}
          mode="edit"
          existingImage={editingModalImage}
          onClose={() => setEditingModalImage(null)}
          onSuccess={(updatedMetadata) => {
            setAvailablePictures(prev => prev.map(img =>
              img.url === editingModalImage.url ? { ...img, metadata: updatedMetadata } : img
            ));
            setSoldPictures(prev => prev.map(img =>
              img.url === editingModalImage.url ? { ...img, metadata: updatedMetadata } : img
            ));
            setEditingModalImage(null);
          }}
        />
      )}
    </div>
  );
}

export default ImgGallery;

