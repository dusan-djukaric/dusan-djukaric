const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      try {
        getCLS(onPerfEntry);
        getFID(onPerfEntry);
        getFCP(onPerfEntry);
        getLCP(onPerfEntry);
        getTTFB(onPerfEntry);
      } catch (error) {
        // Silently handle MutationObserver errors
        console.warn('Web Vitals measurement failed:', error.message);
      }
    }).catch(error => {
      // Handle import errors
      console.warn('Web Vitals import failed:', error.message);
    });
  }
};

export default reportWebVitals;
