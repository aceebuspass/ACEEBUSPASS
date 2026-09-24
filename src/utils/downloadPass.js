import html2canvas from 'html2canvas';

export const downloadBusPass = async (elementId, filename = 'bus-pass') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Bus pass element not found');
    }

    // Wait for images to load
    const images = element.getElementsByTagName('img');
    await Promise.all([...images].map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    }));

    // Wait 500ms to ensure all dynamic elements are settled
    await new Promise(r => setTimeout(r, 500));

    // Create canvas from the element
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2, 
      useCORS: true,
      logging: false,
      allowTaint: false,
      proxy: null,
      width: element.offsetWidth,
      height: element.offsetHeight,
      onclone: (doc) => {
        // Hide effects that might interfere with capture
        const clonedHologram = doc.querySelector('[class*="hologram"]');
        if (clonedHologram) clonedHologram.style.display = 'none';
      }
    });

    // Manual download trigger for better cross-browser support
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = dataUrl;
    link.download = `${filename}.png`;
    
    document.body.appendChild(link);
    link.click();
    
    // Slight delay before removing to ensure trigger works on all browsers
    setTimeout(() => {
      document.body.removeChild(link);
    }, 500);

    return Promise.resolve();
  } catch (error) {
    console.error('Download Pass Error:', error);
    throw error;
  }
};

export const downloadAsPDF = async (elementId, filename = 'bus-pass') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Bus pass element not found');
    }

    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create canvas from the element
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: element.offsetWidth,
      height: element.offsetHeight,
      imageTimeout: 5000
    });

    // Convert canvas to blob and then to PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // For PDF generation, we'll use a simple approach
    // In a real application, you might want to use jsPDF or similar library
    const link = document.createElement('a');
    link.href = imgData;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.jpg`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Error downloading bus pass as PDF:', error);
    throw error;
  }
};
