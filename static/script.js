const lookupTableEl = document.getElementById("lookup-table");
const vectorCanvasEl = document.getElementById("vector-canvas");
const plotStatusEl = document.getElementById("plot-status");
const positionLookupTableEl = document.getElementById("position-lookup-table");
const positionVectorCanvasEl = document.getElementById("position-vector-canvas");
const positionPlotStatusEl = document.getElementById("position-plot-status");
const embedFormEl = document.getElementById("embed-form");
const embedInputEl = document.getElementById("embed-input");
const embedRequestStatusEl = document.getElementById("embed-request-status");
const embedLookupTableEl = document.getElementById("embed-lookup-table");
const embedVectorCanvasEl = document.getElementById("embed-vector-canvas");
const embedPlotStatusEl = document.getElementById("embed-plot-status");
const embedPositionLookupTableEl = document.getElementById("embed-position-lookup-table");
const embedPositionVectorCanvasEl = document.getElementById("embed-position-vector-canvas");
const embedPositionPlotStatusEl = document.getElementById("embed-position-plot-status");
const embedFinalLookupTableEl = document.getElementById("embed-final-lookup-table");
const embedFinalVectorCanvasEl = document.getElementById("embed-final-vector-canvas");
const embedFinalPlotStatusEl = document.getElementById("embed-final-plot-status");

function displayToken(token) {
	return token === " " ? "[space]" : token;
}

function formatNumber(value) {
	return Number(value).toFixed(4);
}

function formatVector(vector) {
	if (!Array.isArray(vector)) {
		return "[]";
	}
	return `[${vector.map(formatNumber).join(", ")}]`;
}

function normalizeEntries(lookupData, config) {
	const rawEntries = Array.isArray(lookupData)
		? lookupData.map((payload, index) => [String(index), payload])
		: Object.entries(lookupData || {});

	return rawEntries
		.map(([key, payload]) => {
			if (!payload || typeof payload !== "object") {
				return null;
			}

			let label = key;
			if (config.labelField && payload[config.labelField] !== undefined) {
				label = payload[config.labelField];
			}

			const idSource = payload[config.idField] ?? payload.position ?? key;
			const id = Number(idSource);

			if (!Number.isFinite(id)) {
				return null;
			}

			return {
				label,
				id,
				embedding: payload[config.embeddingField || "embedding"],
			};
		})
		.filter(Boolean)
		.sort((a, b) => a.id - b.id);
}

function formatLabel(label, config) {
	if (typeof config.labelFormatter === "function") {
		return config.labelFormatter(label);
	}
	if (config.spaceAsToken && label === " ") {
		return displayToken(label);
	}
	return String(label);
}

function renderLookupRows(lookupData, tableEl, config) {
	tableEl.innerHTML = "";
	const entries = normalizeEntries(lookupData, config);

	for (const entry of entries) {
		const row = document.createElement("div");
		row.className = "lookup-row";

		const tokenEl = document.createElement("span");
		tokenEl.className = "token";
		tokenEl.textContent = formatLabel(entry.label, config);

		const arrowOneEl = document.createElement("span");
		arrowOneEl.className = "arrow";
		arrowOneEl.textContent = "->";

		const indexEl = document.createElement("span");
		indexEl.className = "index";
		indexEl.textContent = String(entry.id);

		const arrowTwoEl = document.createElement("span");
		arrowTwoEl.className = "arrow";
		arrowTwoEl.textContent = "->";

		const vectorEl = document.createElement("span");
		vectorEl.className = "vector";
		vectorEl.textContent = formatVector(entry.embedding);

		row.append(tokenEl, arrowOneEl, indexEl, arrowTwoEl, vectorEl);
		tableEl.appendChild(row);
	}
}

function drawAxes(ctx, width, height, minValue, maxValue, padding) {
	const xScale = (width - padding * 2) / (maxValue - minValue);
	const yScale = (height - padding * 2) / (maxValue - minValue);

	const xZero = padding + (0 - minValue) * xScale;
	const yZero = height - padding - (0 - minValue) * yScale;

	ctx.strokeStyle = "#9ab5a7";
	ctx.lineWidth = 1;

	ctx.beginPath();
	ctx.moveTo(padding, yZero);
	ctx.lineTo(width - padding, yZero);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(xZero, padding);
	ctx.lineTo(xZero, height - padding);
	ctx.stroke();

	ctx.fillStyle = "#597264";
	ctx.font = "12px sans-serif";
	ctx.fillText("x", width - padding + 6, yZero + 4);
	ctx.fillText("y", xZero + 6, padding - 4);

	return { xScale, yScale };
}

function plotVectors(lookupData, canvasEl, statusEl, config) {
	const ctx = canvasEl.getContext("2d");
	const width = canvasEl.width;
	const height = canvasEl.height;
	const padding = 46;

	ctx.clearRect(0, 0, width, height);

	const points = normalizeEntries(lookupData, config)
		.map((entry) => {
			const vector = entry.embedding;
			if (!Array.isArray(vector) || vector.length < 2) {
				return null;
			}
			return {
				label: entry.label,
				x: Number(vector[0]),
				y: Number(vector[1]),
			};
		})
		.filter(Boolean);

	if (points.length === 0) {
		statusEl.textContent = `No plottable vectors returned from ${config.endpoint}.`;
		return;
	}

	const maxMagnitude = Math.max(
		...points.flatMap(point => [Math.abs(point.x), Math.abs(point.y)]),
		1
	);

	const limit = maxMagnitude * 1.25;
	const minValue = -limit;
	const maxValue = limit;

	const { xScale, yScale } = drawAxes(ctx, width, height, minValue, maxValue, padding);

	for (const point of points) {
		const px = padding + (point.x - minValue) * xScale;
		const py = height - padding - (point.y - minValue) * yScale;

		ctx.beginPath();
		ctx.fillStyle = config.spaceAsToken && point.label === " " ? "#cf6d3f" : "#1f7a54";
		ctx.arc(px, py, 4.2, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "#223429";
		ctx.font = "11px monospace";
		ctx.fillText(formatLabel(point.label, config), px + 6, py - 6);
	}

	statusEl.textContent = `Plotted ${points.length} vectors from ${config.endpoint}.`;
}

function renderError(message, tableEl, statusEl) {
	tableEl.innerHTML = "";
	const errorEl = document.createElement("p");
	errorEl.className = "error";
	errorEl.textContent = message;
	tableEl.appendChild(errorEl);
	statusEl.textContent = message;
}

function setEmbedRequestStatus(message, isError = false) {
	embedRequestStatusEl.textContent = message;
	embedRequestStatusEl.classList.toggle("error", isError);
}

async function loadLookup(config) {
	try {
		const response = await fetch(config.endpoint);
		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`);
		}

		const lookupData = await response.json();
		renderLookupRows(lookupData, config.tableEl, config);
		plotVectors(lookupData, config.canvasEl, config.statusEl, config);
	} catch (error) {
		renderError(`Could not load ${config.label.toLowerCase()} data. ${error.message}`, config.tableEl, config.statusEl);
	}
}

async function submitTextForEmbedding(text) {
	try {
		setEmbedRequestStatus("Loading embeddings...");
		const response = await fetch(`/embed_text?text=${encodeURIComponent(text)}`);
		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`);
		}

		const embeddingSequence = await response.json();
		renderLookupRows(embeddingSequence, embedLookupTableEl, textConfig);
		plotVectors(embeddingSequence, textConfig.canvasEl, textConfig.statusEl, textConfig);
		renderLookupRows(embeddingSequence, embedPositionLookupTableEl, textPositionConfig);
		plotVectors(embeddingSequence, textPositionConfig.canvasEl, textPositionConfig.statusEl, textPositionConfig);
		renderLookupRows(embeddingSequence, embedFinalLookupTableEl, textFinalConfig);
		plotVectors(embeddingSequence, textFinalConfig.canvasEl, textFinalConfig.statusEl, textFinalConfig);
		setEmbedRequestStatus(`Embedded ${embeddingSequence.length} normalized characters.`);
	} catch (error) {
		renderError(`Could not load text embeddings. ${error.message}`, embedLookupTableEl, embedPlotStatusEl);
		renderError(`Could not load text position embeddings. ${error.message}`, embedPositionLookupTableEl, embedPositionPlotStatusEl);
		renderError(`Could not load text final embeddings. ${error.message}`, embedFinalLookupTableEl, embedFinalPlotStatusEl);
		setEmbedRequestStatus("Could not embed text.", true);
	}
}

const vocabConfig = {
	label: "Vocab",
	endpoint: "/vocab",
	tableEl: lookupTableEl,
	canvasEl: vectorCanvasEl,
	statusEl: plotStatusEl,
	labelField: "char",
	idField: "id",
	spaceAsToken: true,
};

const positionConfig = {
	label: "Position",
	endpoint: "/position",
	tableEl: positionLookupTableEl,
	canvasEl: positionVectorCanvasEl,
	statusEl: positionPlotStatusEl,
	labelField: "position",
	idField: "position",
	spaceAsToken: false,
};

const textConfig = {
	label: "Text",
	endpoint: "/embed_text",
	tableEl: embedLookupTableEl,
	canvasEl: embedVectorCanvasEl,
	statusEl: embedPlotStatusEl,
	labelField: "char",
	spaceAsToken: true,
	embeddingField: "character_embedding",
};

const textPositionConfig = {
	label: "Text Position",
	endpoint: "/embed_text",
	tableEl: embedPositionLookupTableEl,
	canvasEl: embedPositionVectorCanvasEl,
	statusEl: embedPositionPlotStatusEl,
	spaceAsToken: false,
	embeddingField: "position_embedding",
	labelFormatter: (label) => `pos ${label}`,
};

const textFinalConfig = {
	label: "Text Final",
	endpoint: "/embed_text",
	tableEl: embedFinalLookupTableEl,
	canvasEl: embedFinalVectorCanvasEl,
	statusEl: embedFinalPlotStatusEl,
	labelField: "char",
	spaceAsToken: true,
	embeddingField: "final_embedding",
};

embedFormEl.addEventListener("submit", async (event) => {
	event.preventDefault();
	const text = embedInputEl.value;
	if (!text.trim()) {
		setEmbedRequestStatus("Please enter text before submitting.", true);
		renderError("No text submitted yet.", embedLookupTableEl, embedPlotStatusEl);
		renderError("No text submitted yet.", embedPositionLookupTableEl, embedPositionPlotStatusEl);
		renderError("No text submitted yet.", embedFinalLookupTableEl, embedFinalPlotStatusEl);
		return;
	}

	setEmbedRequestStatus("", false);
	await submitTextForEmbedding(text);
});

loadLookup(vocabConfig);
loadLookup(positionConfig);
renderError("Submit text to plot its embeddings.", embedLookupTableEl, embedPlotStatusEl);
renderError("Submit text to plot position embeddings.", embedPositionLookupTableEl, embedPositionPlotStatusEl);
renderError("Submit text to plot final embeddings.", embedFinalLookupTableEl, embedFinalPlotStatusEl);
