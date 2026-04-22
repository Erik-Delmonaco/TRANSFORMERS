const lookupTableEl = document.getElementById("lookup-table");
const vectorCanvasEl = document.getElementById("vector-canvas");
const plotStatusEl = document.getElementById("plot-status");

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

function renderLookupRows(vocabLookup) {
	lookupTableEl.innerHTML = "";

	const entries = Object.entries(vocabLookup).sort((a, b) => a[1].id - b[1].id);

	for (const [token, payload] of entries) {
		const row = document.createElement("div");
		row.className = "lookup-row";

		const tokenEl = document.createElement("span");
		tokenEl.className = "token";
		tokenEl.textContent = displayToken(token);

		const arrowOneEl = document.createElement("span");
		arrowOneEl.className = "arrow";
		arrowOneEl.textContent = "->";

		const indexEl = document.createElement("span");
		indexEl.className = "index";
		indexEl.textContent = String(payload.id);

		const arrowTwoEl = document.createElement("span");
		arrowTwoEl.className = "arrow";
		arrowTwoEl.textContent = "->";

		const vectorEl = document.createElement("span");
		vectorEl.className = "vector";
		vectorEl.textContent = formatVector(payload.embedding);

		row.append(tokenEl, arrowOneEl, indexEl, arrowTwoEl, vectorEl);
		lookupTableEl.appendChild(row);
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

function plotVectors(vocabLookup) {
	const ctx = vectorCanvasEl.getContext("2d");
	const width = vectorCanvasEl.width;
	const height = vectorCanvasEl.height;
	const padding = 46;

	ctx.clearRect(0, 0, width, height);

	const points = Object.entries(vocabLookup)
		.map(([token, payload]) => {
			const vector = payload.embedding;
			if (!Array.isArray(vector) || vector.length < 2) {
				return null;
			}
			return {
				token,
				x: Number(vector[0]),
				y: Number(vector[1]),
			};
		})
		.filter(Boolean);

	if (points.length === 0) {
		plotStatusEl.textContent = "No plottable vectors returned from /vocab.";
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
		ctx.fillStyle = point.token === " " ? "#cf6d3f" : "#1f7a54";
		ctx.arc(px, py, 4.2, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = "#223429";
		ctx.font = "11px monospace";
		ctx.fillText(displayToken(point.token), px + 6, py - 6);
	}

	plotStatusEl.textContent = `Plotted ${points.length} vectors from /vocab.`;
}

function renderError(message) {
	lookupTableEl.innerHTML = "";
	const errorEl = document.createElement("p");
	errorEl.className = "error";
	errorEl.textContent = message;
	lookupTableEl.appendChild(errorEl);
	plotStatusEl.textContent = message;
}

async function loadVocabLookup() {
	try {
		const response = await fetch("/vocab");
		if (!response.ok) {
			throw new Error(`Request failed: ${response.status}`);
		}

		const vocabLookup = await response.json();
		renderLookupRows(vocabLookup);
		plotVectors(vocabLookup);
	} catch (error) {
		renderError(`Could not load vocab data. ${error.message}`);
	}
}

loadVocabLookup();
