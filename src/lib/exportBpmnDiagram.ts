import jsPDF from "jspdf";

/**
 * Export the BPMN SVG canvas to PNG or PDF.
 * Works by cloning the SVG, rendering it onto a canvas, then exporting.
 */

export async function exportBpmnDiagram(
  svgElement: SVGSVGElement,
  format: "png" | "pdf",
  filename: string = "diagramme-bpmn"
): Promise<void> {
  // Clone SVG and prepare for export
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Find the <g transform="translate(...) scale(...)"> group to get bounds
  const contentGroup = clone.querySelector("g[transform]") as SVGGElement | null;

  // Compute bounding box from the original SVG's content group
  const origGroup = svgElement.querySelector("g[transform]") as SVGGElement | null;
  if (!origGroup) throw new Error("No content group found");

  const bbox = origGroup.getBBox();
  const padding = 40;
  const exportW = bbox.width + padding * 2;
  const exportH = bbox.height + padding * 2;

  // Reset the clone: remove pan/zoom, set viewBox to fit content
  clone.setAttribute("width", String(exportW));
  clone.setAttribute("height", String(exportH));
  clone.removeAttribute("style");

  // Update the content group transform to remove pan/zoom and offset to 0,0
  if (contentGroup) {
    contentGroup.setAttribute(
      "transform",
      `translate(${-bbox.x + padding}, ${-bbox.y + padding}) scale(1)`
    );
  }

  // Update grid pattern to be static
  const gridPattern = clone.querySelector("pattern#grid");
  if (gridPattern) {
    gridPattern.setAttribute("patternTransform", "scale(1)");
  }

  // Resolve computed styles for text elements (fill from CSS vars)
  const computedFg = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
  const computedMutedFg = getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground").trim();
  const computedBg = getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
  const computedBorder = getComputedStyle(document.documentElement).getPropertyValue("--border").trim();

  // Replace CSS variable references in the SVG with computed values
  const resolveHslVar = (str: string): string => {
    return str
      .replace(/hsl\(var\(--foreground\)\s*\/?\s*[\d.]*\)/g, (match) => {
        const opacityMatch = match.match(/\/\s*([\d.]+)/);
        const opacity = opacityMatch ? parseFloat(opacityMatch[1]) : 1;
        return `hsla(${computedFg}, ${opacity})`;
      })
      .replace(/hsl\(var\(--foreground\)\)/g, `hsl(${computedFg})`)
      .replace(/hsl\(var\(--muted-foreground\)\s*\/?\s*[\d.]*\)/g, (match) => {
        const opacityMatch = match.match(/\/\s*([\d.]+)/);
        const opacity = opacityMatch ? parseFloat(opacityMatch[1]) : 1;
        return `hsla(${computedMutedFg}, ${opacity})`;
      })
      .replace(/hsl\(var\(--muted-foreground\)\)/g, `hsl(${computedMutedFg})`)
      .replace(/hsl\(var\(--background\)\)/g, `hsl(${computedBg})`)
      .replace(/hsl\(var\(--border\)\)/g, `hsl(${computedBorder})`)
      .replace(/hsl\(var\(--muted\)\s*\/?\s*[\d.]*\)/g, `hsla(${computedMutedFg}, 0.15)`)
      .replace(/hsl\(var\(--primary\)\)/g, `hsl(${computedFg})`);
  };

  // Serialize and resolve variables
  let svgString = new XMLSerializer().serializeToString(clone);
  svgString = resolveHslVar(svgString);

  // Ensure xmlns
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Create image from SVG
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  const scale = 2; // High-DPI export

  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = exportW * scale;
      canvas.height = exportH * scale;
      const ctx = canvas.getContext("2d")!;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, exportW, exportH);

      URL.revokeObjectURL(url);

      if (format === "png") {
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) { reject(new Error("Failed to create PNG")); return; }
          downloadBlob(pngBlob, `${filename}.png`);
          resolve();
        }, "image/png");
      } else {
        // PDF export
        const isLandscape = exportW > exportH;
        const pdf = new jsPDF({
          orientation: isLandscape ? "landscape" : "portrait",
          unit: "px",
          format: [exportW, exportH],
        });

        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, exportW, exportH);
        pdf.save(`${filename}.pdf`);
        resolve();
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG image"));
    };
    img.src = url;
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
