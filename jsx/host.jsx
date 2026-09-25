/* global app, UnitValue, SolidColor, NewDocumentMode, DocumentFill, Direction, LayerKind, ElementPlacement, DialogModes, SaveDocumentType, ExportType, ExportOptionsSaveForWeb, Extension, SaveOptions */
var CarouselHost = (function () {
    function cleanText(value) { return String(value).replace(/[\\\/:*?"<>|]/g, "-"); }
    function json(ok, message, extra) {
        var out = '{"ok":' + (ok ? "true" : "false") + ',"message":"' + String(message).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, " ") + '"';
        if (extra) out += ',' + extra;
        return out + '}';
    }
    function asPx(value) { return UnitValue(Number(value), "px"); }
    function makeColor(hex) { var color = new SolidColor(); color.rgb.hexValue = String(hex).replace("#", ""); return color; }
    function rgbFromHex(hex) {
        var value = String(hex || "#00FFFF").replace("#", "");
        if (value.length === 3) value = value.charAt(0) + value.charAt(0) + value.charAt(1) + value.charAt(1) + value.charAt(2) + value.charAt(2);
        return { r: parseInt(value.substr(0, 2), 16), g: parseInt(value.substr(2, 2), 16), b: parseInt(value.substr(4, 2), 16) };
    }
    function addColoredGuide(doc, direction, position, hex) {
        try {
            var s2t = stringIDToTypeID, c2t = charIDToTypeID;
            var color = rgbFromHex(hex);
            var guide = new ActionDescriptor();
            guide.putInteger(c2t("GdCA"), 0);
            guide.putInteger(c2t("GdCR"), color.r);
            guide.putInteger(c2t("GdCG"), color.g);
            guide.putInteger(c2t("GdCB"), color.b);
            var orientation = direction === Direction.VERTICAL ? "vertical" : "horizontal";
            guide.putEnumerated(s2t("orientation"), s2t(orientation), s2t(orientation));
            guide.putUnitDouble(s2t("position"), s2t("pixelsUnit"), Number(position));
            var descriptor = new ActionDescriptor();
            descriptor.putEnumerated(s2t("guideTarget"), s2t("guideTarget"), s2t("guideTargetCanvas"));
            descriptor.putObject(s2t("new"), s2t("good"), guide);
            executeAction(s2t("make"), descriptor, DialogModes.NO);
        } catch (e) {
            doc.guides.add(direction, asPx(position));
        }
    }
    function removeGuides(doc) { for (var i = doc.guides.length - 1; i >= 0; i--) doc.guides[i].remove(); }
    function addGuideSet(doc, width, height, slides, margin, safe, replace, boundaryColorString, safeColor) {
        if (replace) removeGuides(doc);
        var i, boundaryColors = String(boundaryColorString || "#A7F04F").split(",");
        for (i = 1; i < slides; i++) addColoredGuide(doc, Direction.VERTICAL, i * width, boundaryColors[(i - 1) % boundaryColors.length]);
        if (safe && margin > 0) {
            addColoredGuide(doc, Direction.HORIZONTAL, margin, safeColor);
            addColoredGuide(doc, Direction.HORIZONTAL, height - margin, safeColor);
            for (i = 0; i < slides; i++) {
                addColoredGuide(doc, Direction.VERTICAL, (i * width) + margin, safeColor);
                addColoredGuide(doc, Direction.VERTICAL, ((i + 1) * width) - margin, safeColor);
            }
        }
    }
    function withPixels(fn) {
        var oldUnits = app.preferences.rulerUnits;
        var oldDialogs = app.displayDialogs;
        app.preferences.rulerUnits = Units.PIXELS;
        app.displayDialogs = DialogModes.NO;
        try { return fn(); } finally { app.preferences.rulerUnits = oldUnits; app.displayDialogs = oldDialogs; }
    }
    function hasRootGroup(doc, name) {
        for (var i = 0; i < doc.layerSets.length; i++) if (doc.layerSets[i].name === name) return true;
        return false;
    }
    function addSlideGroup(doc, index, width, margin) {
        var groupName = "Slide " + (index + 1 < 10 ? "0" : "") + (index + 1);
        if (hasRootGroup(doc, groupName)) return false;
        var group = doc.layerSets.add(); group.name = groupName;
        var label = doc.artLayers.add(); label.kind = LayerKind.TEXT; label.name = "Slide label — hidden from export";
        label.textItem.contents = (index + 1 < 10 ? "0" : "") + (index + 1);
        label.textItem.position = [asPx((index * width) + margin), asPx(Math.max(margin, 48))];
        label.textItem.size = asPx(Math.max(18, Math.min(42, width * 0.03))); label.textItem.color = makeColor("A7F04F");
        label.opacity = 38; label.visible = false; label.move(group, ElementPlacement.INSIDE);
        return true;
    }
    function ensureSlideGroups(doc, slides, width, margin) {
        var added = 0;
        for (var i = slides - 1; i >= 0; i--) if (addSlideGroup(doc, i, width, margin)) added++;
        return added;
    }
    function createDocument(width, height, slides, resolution, margin, background, safeGuides, slideGroups, boundaryColors, safeGuideColor) {
        try {
            width = Number(width); height = Number(height); slides = Number(slides); resolution = Number(resolution); margin = Number(margin);
            if (width < 1 || height < 1 || slides < 2 || width * slides > 300000) return json(false, "Invalid canvas dimensions.");
            return withPixels(function () {
                var doc = app.documents.add(width * slides, height, resolution, "Seamless Carousel — " + slides + " slides", NewDocumentMode.RGB, DocumentFill.TRANSPARENT, 1, BitsPerChannelType.EIGHT);
                var bg = doc.artLayers.add(); bg.name = "Carousel Background";
                doc.selection.selectAll(); doc.selection.fill(makeColor(background)); doc.selection.deselect();
                bg.move(doc, ElementPlacement.PLACEATEND); bg.allLocked = true;
                addGuideSet(doc, width, height, slides, margin, safeGuides, false, boundaryColors, safeGuideColor);
                if (slideGroups) ensureSlideGroups(doc, slides, width, margin);
                app.activeDocument = doc;
                return json(true, "Created " + slides + "-slide carousel · " + (width * slides) + " × " + height + " px");
            });
        } catch (e) { return json(false, "Create failed: " + e.message); }
    }
    function updateDocument(width, height, slides, margin, safeGuides, slideGroups, boundaryColors, safeGuideColor) {
        try {
            if (!app.documents.length) return json(false, "Open the carousel document you want to update.");
            width = Number(width); height = Number(height); slides = Number(slides); margin = Number(margin);
            if (width < 1 || height < 1 || slides < 2 || width * slides > 300000) return json(false, "Invalid carousel dimensions.");
            return withPixels(function () {
                var doc = app.activeDocument;
                var oldWidth = Math.round(doc.width.as("px")), oldHeight = Math.round(doc.height.as("px"));
                doc.resizeCanvas(asPx(width * slides), asPx(height), AnchorPosition.TOPLEFT);
                addGuideSet(doc, width, height, slides, margin, safeGuides, true, boundaryColors, safeGuideColor);
                var groupsAdded = slideGroups ? ensureSlideGroups(doc, slides, width, margin) : 0;
                return json(true, "Updated carousel from " + oldWidth + " × " + oldHeight + " to " + (width * slides) + " × " + height + " px" + (groupsAdded ? " · added " + groupsAdded + " slide group" + (groupsAdded === 1 ? "" : "s") : ""));
            });
        } catch (e) { return json(false, "Update failed: " + e.message); }
    }
    function addGuides(width, height, slides, margin, safeGuides, replace, boundaryColors, safeGuideColor) {
        try {
            if (!app.documents.length) return json(false, "Open a Photoshop document first.");
            return withPixels(function () {
                var doc = app.activeDocument;
                width = Number(width); height = Number(height); slides = Number(slides); margin = Number(margin);
                var actualW = Math.round(doc.width.as("px")), actualH = Math.round(doc.height.as("px"));
                if (actualW < width * slides || actualH < height) return json(false, "Active document is smaller than " + (width * slides) + " × " + height + " px.");
                addGuideSet(doc, width, height, slides, margin, safeGuides, replace, boundaryColors, safeGuideColor);
                return json(true, "Carousel guides added to “" + doc.name + "”.");
            });
        } catch (e) { return json(false, "Guide setup failed: " + e.message); }
    }
    function exportSlides(width, height, slides, format, quality, prefix) {
        try {
            if (!app.documents.length) return json(false, "Open the carousel document first.");
            var folder = Folder.selectDialog("Choose a folder for the carousel slides");
            if (!folder) return json(false, "Export cancelled.");
            return withPixels(function () {
                var source = app.activeDocument;
                width = Number(width); height = Number(height); slides = Number(slides); quality = Number(quality);
                var actualW = Math.round(source.width.as("px")), actualH = Math.round(source.height.as("px"));
                if (actualW < width * slides || actualH < height) return json(false, "Document must be at least " + (width * slides) + " × " + height + " px for these settings.");
                prefix = cleanText(prefix || "carousel");
                for (var i = 0; i < slides; i++) {
                    app.activeDocument = source;
                    var temp = source.duplicate(prefix + "_" + (i + 1 < 10 ? "0" : "") + (i + 1), false);
                    temp.crop([asPx(i * width), asPx(0), asPx((i + 1) * width), asPx(height)], 0, asPx(width), asPx(height));
                    var options = new ExportOptionsSaveForWeb();
                    var ext;
                    if (String(format).toUpperCase() === "JPG") {
                        options.format = SaveDocumentType.JPEG; options.quality = quality; options.optimized = true; options.includeProfile = false; ext = ".jpg";
                    } else {
                        options.format = SaveDocumentType.PNG; options.PNG8 = false; options.transparency = true; options.interlaced = false; ext = ".png";
                    }
                    var file = new File(folder.fsName + "/" + prefix + "_" + (i + 1 < 10 ? "0" : "") + (i + 1) + ext);
                    temp.exportDocument(file, ExportType.SAVEFORWEB, options);
                    temp.close(SaveOptions.DONOTSAVECHANGES);
                }
                app.activeDocument = source;
                return json(true, "Exported " + slides + " slides to " + folder.fsName);
            });
        } catch (e) { return json(false, "Export failed: " + e.message); }
    }
    return { createDocument: createDocument, updateDocument: updateDocument, addGuides: addGuides, exportSlides: exportSlides };
}());
