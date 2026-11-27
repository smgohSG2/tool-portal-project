// Process Flow Diagram Builder.
// Reads the text the student types (one step per line), works out where each
// shape goes, and draws the flowchart as an SVG image (a picture the browser
// builds from code). No libraries are used.

(function () {
  "use strict";

  var EXAMPLE = [
    "Receive order",
    "Check stock",
    "? Item in stock?",
    "yes: Pack order",
    "no: Tell customer it is delayed",
    "Ship order"
  ].join("\n");

  // ----- Sizes (in SVG units, roughly pixels) -----
  var FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  var FONT_SIZE = 14;
  var LINE_HEIGHT = 18;
  var PAD_X = 14;
  var PAD_Y = 10;
  var GAP = 34;            // space between one shape and the next
  var MARGIN = 20;         // empty border around the whole diagram
  var BOX_WRAP = 190;      // text wraps to this width inside boxes
  var DIAMOND_WRAP = 130;  // and to this width inside decisions

  // ----- Colors -----
  // On the page the diagram uses the theme's CSS variables, so it follows the
  // light/dark toggle. The downloaded file is always light, so it looks right
  // when pasted into a document or slide.
  var PAGE_COLORS = { line: "var(--text)", fill: "var(--card-bg)", text: "var(--text)", background: null };
  var FILE_COLORS = { line: "#1a1a1a", fill: "#f5f5f5", text: "#1a1a1a", background: "#ffffff" };

  // ----- Measuring text -----
  var canvasContext = document.createElement("canvas").getContext("2d");
  canvasContext.font = FONT_SIZE + "px " + FONT_FAMILY;

  function textWidth(s) {
    return canvasContext.measureText(s).width;
  }

  // Splits text into lines no wider than maxWidth. Returns the lines and the
  // size of the block they make.
  function wrap(text, maxWidth) {
    var words = text.split(/\s+/);
    var lines = [];
    var current = "";
    words.forEach(function (word) {
      var attempt = current ? current + " " + word : word;
      if (current && textWidth(attempt) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = attempt;
      }
    });
    if (current) { lines.push(current); }
    var widest = 0;
    lines.forEach(function (l) { widest = Math.max(widest, textWidth(l)); });
    return { lines: lines, w: widest, h: lines.length * LINE_HEIGHT };
  }

  // ----- Step 1: read the text -----
  // Returns the list of steps/decisions plus plain-language messages about
  // any lines that could not be understood.
  function parse(text) {
    var items = [];
    var messages = [];
    var openDecision = null; // the decision that yes:/no: lines may attach to

    text.split(/\r?\n/).forEach(function (raw, index) {
      var line = raw.trim();
      var n = index + 1;
      var match;
      if (!line) { return; }

      if (line.charAt(0) === "?") {
        var question = line.slice(1).trim();
        if (!question) {
          messages.push("Line " + n + ": write the question after the ?");
          return;
        }
        openDecision = { type: "decision", text: question, yes: null, no: null, line: n };
        items.push(openDecision);
      } else if ((match = /^(yes|no)\s*:\s*(.*)$/i.exec(line))) {
        var which = match[1].toLowerCase();
        var stepText = match[2].trim();
        if (!openDecision) {
          messages.push("Line " + n + ": a \"" + which + ":\" line must come right after a ? decision.");
        } else if (!stepText) {
          messages.push("Line " + n + ": write what happens after \"" + which + ":\".");
        } else if (openDecision[which] !== null) {
          messages.push("Line " + n + ": that decision already has a \"" + which + ":\" line.");
        } else {
          openDecision[which] = stepText;
        }
      } else {
        openDecision = null;
        items.push({ type: "step", text: line });
      }
    });

    items.forEach(function (item) {
      if (item.type === "decision" && item.yes === null && item.no === null) {
        messages.push("Line " + item.line + ": the decision \"" + item.text +
          "\" needs a \"yes:\" and/or a \"no:\" line right after it.");
      }
    });

    return { items: items, messages: messages };
  }

  // ----- Step 2: work out where everything goes -----
  // The main path runs straight down the middle (x = 0). A decision's two
  // branches sit left and right of it and join back at a point below.
  function boxSize(text, isTerminal) {
    var t = wrap(text, BOX_WRAP);
    var w = Math.max(t.w + PAD_X * 2, 84);
    var h = t.h + PAD_Y * 2;
    return { lines: t.lines, w: w, h: h, terminal: !!isTerminal };
  }

  function layout(items) {
    var nodes = [{ type: "terminal", text: "Start" }]
      .concat(items, [{ type: "terminal", text: "End" }]);
    var shapes = [];
    var edges = [];   // lines: { pts: [[x, y], ...], arrow: true/false }
    var labels = [];  // small "Yes" / "No" words
    var y = 0;        // bottom of the previous shape (or the point where branches rejoin)
    var hasPrevious = false;

    nodes.forEach(function (node) {
      var top = hasPrevious ? y + GAP : 0;
      if (hasPrevious) { edges.push({ pts: [[0, y], [0, top]], arrow: true }); }

      if (node.type !== "decision") {
        var b = boxSize(node.text, node.type === "terminal");
        shapes.push({ kind: b.terminal ? "terminal" : "step", cx: 0, cy: top + b.h / 2, w: b.w, h: b.h, lines: b.lines });
        y = top + b.h;
        hasPrevious = true;
        return;
      }

      // A decision: a diamond, sized so its text fits inside.
      var t = wrap(node.text, DIAMOND_WRAP);
      var W = Math.max(130, t.w * 2 + 30);
      var H = Math.max(76, t.h * 2 + 30);
      var cy = top + H / 2;
      shapes.push({ kind: "decision", cx: 0, cy: cy, w: W, h: H, lines: t.lines });

      if (node.yes === null && node.no === null) {
        y = top + H;
        hasPrevious = true;
        return;
      }

      var yes = node.yes !== null ? boxSize(node.yes) : null;
      var no = node.no !== null ? boxSize(node.no) : null;
      var yesW = yes ? yes.w : 0;
      var noW = no ? no.w : 0;
      var dx = Math.max(W / 2 + 40, (yesW + noW) / 4 + 20); // how far each branch sits from the middle
      var boxTop = top + H + 24;
      var boxBottom = boxTop + Math.max(yes ? yes.h : 0, no ? no.h : 0);
      var mergeY = boxBottom + 24;

      [["Yes", yes, -1], ["No", no, 1]].forEach(function (branch) {
        var label = branch[0];
        var box = branch[1];
        var side = branch[2];
        var bx = side * dx;
        var vertexX = side * W / 2;
        labels.push({ text: label, x: side * (W / 2 + (dx - W / 2) / 2), y: cy - 6 });
        if (box) {
          shapes.push({ kind: "step", cx: bx, cy: boxTop + box.h / 2, w: box.w, h: box.h, lines: box.lines });
          edges.push({ pts: [[vertexX, cy], [bx, cy], [bx, boxTop]], arrow: true });
          edges.push({ pts: [[bx, boxTop + box.h], [bx, mergeY], [0, mergeY]], arrow: false });
        } else {
          // No step written for this answer: the path simply skips ahead.
          edges.push({ pts: [[vertexX, cy], [bx, cy], [bx, mergeY], [0, mergeY]], arrow: false });
        }
      });

      y = mergeY;
      hasPrevious = true;
    });

    return { shapes: shapes, edges: edges, labels: labels };
  }

  // ----- Step 3: draw it -----
  function escapeText(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function num(n) {
    return Math.round(n * 10) / 10;
  }

  function drawSvg(plan, colors) {
    // Find the edges of everything so the picture is cropped neatly.
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    function include(x, y) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    plan.shapes.forEach(function (s) {
      include(s.cx - s.w / 2, s.cy - s.h / 2);
      include(s.cx + s.w / 2, s.cy + s.h / 2);
    });
    plan.edges.forEach(function (e) {
      e.pts.forEach(function (p) { include(p[0], p[1]); });
    });

    var x0 = minX - MARGIN;
    var y0 = minY - MARGIN;
    var width = Math.ceil(maxX - minX + MARGIN * 2);
    var height = Math.ceil(maxY - minY + MARGIN * 2);
    var out = [];

    out.push('<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Flowchart of the process described in the text box"' +
      ' width="' + width + '" height="' + height + '" viewBox="' + num(x0) + " " + num(y0) + " " + width + " " + height + '"' +
      ' font-family=\'' + FONT_FAMILY.replace(/"/g, "&quot;") + '\' font-size="' + FONT_SIZE + '">');
    out.push('<defs><marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">' +
      '<path d="M0,0 L10,5 L0,10 z" style="fill:' + colors.line + '"/></marker></defs>');
    if (colors.background) {
      out.push('<rect x="' + num(x0) + '" y="' + num(y0) + '" width="' + width + '" height="' + height + '" fill="' + colors.background + '"/>');
    }

    plan.edges.forEach(function (e) {
      var points = e.pts.map(function (p) { return num(p[0]) + "," + num(p[1]); }).join(" ");
      out.push('<polyline points="' + points + '" style="fill:none;stroke:' + colors.line + ';stroke-width:1.5"' +
        (e.arrow ? ' marker-end="url(#arrowhead)"' : "") + "/>");
    });

    plan.shapes.forEach(function (s) {
      var style = 'style="fill:' + colors.fill + ";stroke:" + colors.line + ';stroke-width:1.5"';
      var left = s.cx - s.w / 2;
      var topY = s.cy - s.h / 2;
      if (s.kind === "decision") {
        out.push('<polygon points="' + num(s.cx) + "," + num(topY) + " " + num(s.cx + s.w / 2) + "," + num(s.cy) + " " +
          num(s.cx) + "," + num(topY + s.h) + " " + num(left) + "," + num(s.cy) + '" ' + style + "/>");
      } else {
        var radius = s.kind === "terminal" ? s.h / 2 : 4;
        out.push('<rect x="' + num(left) + '" y="' + num(topY) + '" width="' + num(s.w) + '" height="' + num(s.h) +
          '" rx="' + num(radius) + '" ' + style + "/>");
      }
      var firstLineY = s.cy - ((s.lines.length - 1) * LINE_HEIGHT) / 2 + FONT_SIZE * 0.35;
      var tspans = s.lines.map(function (line, i) {
        return '<tspan x="' + num(s.cx) + '" y="' + num(firstLineY + i * LINE_HEIGHT) + '">' + escapeText(line) + "</tspan>";
      }).join("");
      out.push('<text text-anchor="middle" style="fill:' + colors.text + '">' + tspans + "</text>");
    });

    plan.labels.forEach(function (l) {
      out.push('<text x="' + num(l.x) + '" y="' + num(l.y) + '" text-anchor="middle" font-size="12" style="fill:' +
        colors.text + '">' + l.text + "</text>");
    });

    out.push("</svg>");
    return out.join("");
  }

  // ----- Wiring it to the page -----
  var input = document.getElementById("process-input");
  var diagram = document.getElementById("diagram");
  var messageList = document.getElementById("messages");
  var downloadButton = document.getElementById("download-svg");
  var currentPlan = null;

  function update() {
    var result = parse(input.value);

    messageList.innerHTML = "";
    result.messages.forEach(function (m) {
      var li = document.createElement("li");
      li.textContent = m;
      messageList.appendChild(li);
    });

    if (result.items.length === 0) {
      currentPlan = null;
      diagram.innerHTML = '<p class="diagram-empty">Your diagram will appear here. Type at least one step on the left (or above, on a phone).</p>';
      downloadButton.disabled = true;
      return;
    }

    currentPlan = layout(result.items);
    diagram.innerHTML = drawSvg(currentPlan, PAGE_COLORS);
    downloadButton.disabled = false;
  }

  function download() {
    if (!currentPlan) { return; }
    var svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + drawSvg(currentPlan, FILE_COLORS);
    var blob = new Blob([svg], { type: "image/svg+xml" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "process-diagram.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  input.addEventListener("input", update);
  downloadButton.addEventListener("click", download);
  document.getElementById("load-example").addEventListener("click", function () {
    input.value = EXAMPLE;
    update();
  });
  document.getElementById("clear-input").addEventListener("click", function () {
    input.value = "";
    update();
    input.focus();
  });

  input.value = EXAMPLE;
  update();
})();
