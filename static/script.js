const vocabListEl = document.getElementById("vocab-list");
const encodeFormEl = document.getElementById("encode-form");
const encodeInputEl = document.getElementById("encode-input");
const encodeOutputEl = document.getElementById("encode-output");
const charSelectEl = document.getElementById("char-select");
const vectorChartCanvasEl = document.getElementById("vector-chart");
const allVectorsChartCanvasEl = document.getElementById("all-vectors-chart");

let vocabMapping = {};
let chartInstance = null;
let allVectorsChartInstance = null;

function formatToken(token) {
	return token === " " ? "[space]" : token;
}

function formatVector(vector) {
	return "[" + vector.map(v => v.toFixed(4)).join(", ") + "]";
}

async function fetchEmbedding(char) {
	const params = new URLSearchParams({ char });
	const response = await fetch(`/embed?${params.toString()}`);
	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
	}
	return response.json();
}

async function renderVocab(mapping) {
	const entries = Object.entries(mapping).sort((a, b) => a[1] - b[1]);

	vocabListEl.innerHTML = "";

	for (const [token, index] of entries) {
		const row = document.createElement("div");
		row.className = "vocab-row";

		const tokenEl = document.createElement("span");
		tokenEl.className = "token";
		tokenEl.textContent = formatToken(token);

		const arrowEl1 = document.createElement("span");
		arrowEl1.className = "arrow";
		arrowEl1.textContent = "->";

		const indexEl = document.createElement("span");
		indexEl.className = "index";
		indexEl.textContent = String(index);

		const arrowEl2 = document.createElement("span");
		arrowEl2.className = "arrow";
		arrowEl2.textContent = "->";

		const vectorEl = document.createElement("span");
		vectorEl.className = "vector";
		vectorEl.textContent = "Loading...";

		row.append(tokenEl, arrowEl1, indexEl, arrowEl2, vectorEl);
		vocabListEl.appendChild(row);

		try {
			const embedding = await fetchEmbedding(token);
			vectorEl.textContent = formatVector(embedding);
		} catch (error) {
			vectorEl.textContent = "Error";
			vectorEl.classList.add("error");
		}
	}
}

async function loadVocab() {
	try {
		const response = await fetch("/vocab");
		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const mapping = await response.json();
		vocabMapping = mapping;
		await renderVocab(mapping);
		populateCharSelect(mapping);
	} catch (error) {
		vocabListEl.innerHTML = "";
		const errorEl = document.createElement("p");
		errorEl.className = "error";
		errorEl.textContent = `Could not load vocabulary: ${error.message}`;
		vocabListEl.appendChild(errorEl);
	}
}

function populateCharSelect(mapping) {
	const entries = Object.entries(mapping).sort((a, b) => a[1] - b[1]);
	charSelectEl.innerHTML = "";

	for (const [char, index] of entries) {
		const option = document.createElement("option");
		option.value = char;
		option.textContent = formatToken(char);
		charSelectEl.appendChild(option);
	}

	// Select space by default
	charSelectEl.value = " ";
}

async function plotVector(char) {
	try {
		const embedding = await fetchEmbedding(char);
		const [x, y] = embedding;

		const ctx = vectorChartCanvasEl.getContext("2d");

		if (chartInstance) {
			chartInstance.destroy();
		}

		// Determine axis limits with some padding
		const maxVal = Math.max(Math.abs(x), Math.abs(y)) * 1.2 + 0.5;

		chartInstance = new Chart(ctx, {
			type: "scatter",
			data: {
				datasets: [
					{
						label: `Vector for '${formatToken(char)}'`,
						data: [
							{ x: 0, y: 0 },
							{ x, y },
						],
						borderColor: "rgba(47, 106, 223, 1)",
						backgroundColor: "rgba(47, 106, 223, 0.8)",
						showLine: true,
						borderWidth: 3,
						pointRadius: [5, 8],
						pointBackgroundColor: ["rgba(100, 100, 100, 0.5)", "rgba(47, 106, 223, 1)"],
						pointBorderColor: ["rgba(100, 100, 100, 0.8)", "rgba(47, 106, 223, 1)"],
						pointBorderWidth: 2,
						fill: false,
						tension: 0,
					},
					{
						label: "Axes",
						data: [],
						type: "line",
						borderColor: "rgba(200, 200, 200, 0.5)",
						borderWidth: 1,
						borderDash: [5, 5],
						fill: false,
						pointRadius: 0,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					legend: {
						display: true,
						position: "top",
					},
				},
				scales: {
					x: {
						type: "linear",
						position: "center",
						min: -maxVal,
						max: maxVal,
						title: {
							display: true,
							text: "Dimension 0",
						},
					},
					y: {
						type: "linear",
						position: "center",
						min: -maxVal,
						max: maxVal,
						title: {
							display: true,
							text: "Dimension 1",
						},
					},
				},
			},
		});
	} catch (error) {
		console.error("Error plotting vector:", error);
	}
}

async function handleCharSelect(event) {
	await plotVector(event.target.value);
}

async function plotAllVectors() {
	try {
		const entries = Object.entries(vocabMapping).sort((a, b) => a[1] - b[1]);
		const data = [];

		for (const [char, index] of entries) {
			const embedding = await fetchEmbedding(char);
			const [x, y] = embedding;
			data.push({
				x,
				y,
				label: formatToken(char),
				char,
			});
		}

		const ctx = allVectorsChartCanvasEl.getContext("2d");

		if (allVectorsChartInstance) {
			allVectorsChartInstance.destroy();
		}

		// Determine axis limits
		const xVals = data.map(d => Math.abs(d.x));
		const yVals = data.map(d => Math.abs(d.y));
		const maxVal = Math.max(...xVals, ...yVals) * 1.2 + 0.5;

		allVectorsChartInstance = new Chart(ctx, {
			type: "scatter",
			data: {
				datasets: [
					{
						label: "Vocabulary Vectors",
						data: data.map(d => ({ x: d.x, y: d.y })),
						backgroundColor: "rgba(47, 106, 223, 0.6)",
						borderColor: "rgba(47, 106, 223, 0.8)",
						pointRadius: 6,
						pointBorderWidth: 1,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				plugins: {
					legend: {
						display: true,
						position: "top",
					},
					tooltip: {
						callbacks: {
							label: function (context) {
								const dataIndex = context.dataIndex;
								return `'${data[dataIndex].label}'`;
							},
						},
					},
				},
				scales: {
					x: {
						type: "linear",
						position: "center",
						min: -maxVal,
						max: maxVal,
						title: {
							display: true,
							text: "Dimension 0",
						},
					},
					y: {
						type: "linear",
						position: "center",
						min: -maxVal,
						max: maxVal,
						title: {
							display: true,
							text: "Dimension 1",
						},
					},
				},
			},
		});
	} catch (error) {
		console.error("Error plotting all vectors:", error);
	}
}

async function encodeString(rawText) {
	const params = new URLSearchParams({ string: rawText });
	const response = await fetch(`/encode?${params.toString()}`);
	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
	}

	return response.json();
}

async function handleEncodeSubmit(event) {
	event.preventDefault();
	encodeOutputEl.textContent = "Encoding...";
	encodeOutputEl.classList.remove("error");

	try {
		const text = encodeInputEl.value;
		const encoded = await encodeString(text);
		encodeOutputEl.textContent = `[${encoded.join(", ")}]`;
	} catch (error) {
		encodeOutputEl.textContent = `Could not encode string: ${error.message}`;
		encodeOutputEl.classList.add("error");
	}
}

encodeFormEl.addEventListener("submit", handleEncodeSubmit);
charSelectEl.addEventListener("change", handleCharSelect);

async function initializePage() {
	await loadVocab();
	// Plot space character by default
	await plotVector(" ");
	// Plot all vectors
	await plotAllVectors();
}

initializePage();

