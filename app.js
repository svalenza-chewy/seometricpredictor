import { FALLBACK_PAGE_TYPES } from "./fallback-page-types.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const FORECAST_MONTHS = 24;
const DEFAULT_ROADMAP_QUARTER_COUNT = 4;
const WEEKS_PER_QUARTER = 13;
const DEFAULT_DURATION_WEEKS = 12;

const KPI_LABELS = {
  ENGAGEMENT_RATE: "Engagement Rate",
  BOUNCE_RATE: "Bounce Rate",
  GROSS_REVENUE: "Gross Revenue",
  AOV: "Average Order Value",
  RPS: "Revenue Per Session",
  "Acquisition Conversion Rate": "Acquisition Conversion Rate",
  "Order Conversion Rate": "Order Conversion Rate",
  IMPRESSIONS: "Impressions",
  "Click through rate": "Click Through Rate",
};

function buildRoadmapQuarters(count = DEFAULT_ROADMAP_QUARTER_COUNT, startDate = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(startDate.getFullYear(), startDate.getMonth() + index * 3, 1);
    const end = new Date(startDate.getFullYear(), startDate.getMonth() + index * 3 + 3, 0);

    return {
      id: `roadmap-quarter-${index + 1}`,
      year: start.getFullYear(),
      quarterNumber: index + 1,
      label: `Quarter ${index + 1}`,
      spanLabel: `${MONTH_NAMES[start.getMonth()].slice(0, 3)}-${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  });
}

function buildRoadmapWeeks(count, startDate = new Date()) {
  const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(normalizedStartDate);
    date.setDate(date.getDate() + index * 7);
    return {
      id: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
      monthLabel: MONTH_NAMES[date.getMonth()].slice(0, 3),
      dayOfMonth: date.getDate(),
      label: `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getDate()}`,
      isoDate: date.toISOString().slice(0, 10),
      weekNumber: index + 1,
    };
  });
}

function formatMonthInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthInputValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date();
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return new Date(year, month, 1);
}

function buildRoadmapStartMonthOptions(selectedValue, count = 30) {
  const selectedDate = parseMonthInputValue(selectedValue);
  const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 6, 1);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return {
      value: formatMonthInputValue(date),
      label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
    };
  });
}

function getRoadmapWeekIndexFromPointer(event, gridElement) {
  const rect = gridElement.getBoundingClientRect();
  if (!rect.width) return 0;
  const offsetX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width - 1);
  const totalWeeks = Math.max(1, state.roadmapWeeks.length);
  return Math.max(0, Math.min(Math.floor((offsetX / rect.width) * totalWeeks), totalWeeks - 1));
}

const state = {
  apiKey: "",
  apiSecret: "",
  isConnected: false,
  connecting: false,
  accounts: [],
  webProperties: [],
  keywordGroups: [],
  selectedAccountId: "",
  selectedWebPropertyId: "",
  selectedGroupId: "",
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  selectedPageTypes: [],
  pageTypes: [],
  summary: null,
  annualSearchVolumeOverride: null,
  annualSearchVolumeDraft: "",
  currentShareOverride: null,
  annualTrafficOpportunityOverride: null,
  annualTrafficOpportunityDraft: "",
  currentOutcome: null,
  savedOutcomes: [],
  nextOutcomeId: 1,
  nextPlacementId: 1,
  groupAssignments: {},
  roadmapStartMonth: formatMonthInputValue(new Date()),
  roadmapQuarterCount: DEFAULT_ROADMAP_QUARTER_COUNT,
  roadmapQuarters: buildRoadmapQuarters(DEFAULT_ROADMAP_QUARTER_COUNT, new Date()),
  roadmapWeeks: buildRoadmapWeeks(DEFAULT_ROADMAP_QUARTER_COUNT * WEEKS_PER_QUARTER, new Date()),
  roadmapLanes: [
    { id: "lane-1", name: "Track 1" },
    { id: "lane-2", name: "Track 2" },
    { id: "lane-3", name: "Track 3" },
    { id: "lane-4", name: "Track 4" },
  ],
  roadmapQuarterLabels: ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"],
  roadmapPlacements: [],
  shareLift: 4,
  loading: false,
  error: "",
  previewMode: false,
  hostedPreviewMode: false,
};

const elements = {
  apiKeyInput: document.querySelector("#apiKeyInput"),
  apiSecretInput: document.querySelector("#apiSecretInput"),
  connectButton: document.querySelector("#connectButton"),
  accountSelect: document.querySelector("#accountSelect"),
  webPropertySelect: document.querySelector("#webPropertySelect"),
  keywordGroupSelect: document.querySelector("#keywordGroupSelect"),
  monthSelect: document.querySelector("#monthSelect"),
  yearSelect: document.querySelector("#yearSelect"),
  pageTypes: document.querySelector("#pageTypes"),
  metricInputs: document.querySelector("#metricInputs"),
  annualSearchVolume: document.querySelector("#annualSearchVolume"),
  currentShare: document.querySelector("#currentShare"),
  projectedShare: document.querySelector("#projectedShare"),
  projectedTraffic: document.querySelector("#projectedTraffic"),
  forecastHead: document.querySelector("#forecastHead"),
  forecastBody: document.querySelector("#forecastBody"),
  datasetName: document.querySelector("#datasetName"),
  datasetSummary: document.querySelector("#datasetSummary"),
  statusBanner: document.querySelector("#statusBanner"),
  shareStatus: document.querySelector("#shareStatus"),
  saveOutcomeButton: document.querySelector("#saveOutcomeButton"),
  exportOutcomesButton: document.querySelector("#exportOutcomesButton"),
  currentOutcomeCard: document.querySelector("#currentOutcomeCard"),
  outcomeTray: document.querySelector("#outcomeTray"),
  groupBoard: document.querySelector("#groupBoard"),
  roadmapBoard: document.querySelector("#roadmapBoard"),
};

function formatInteger(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatMetricValue(value, unit) {
  if (unit === "%") return formatPercent(value);
  if (unit === "$") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value || 0);
  }
  return formatInteger(value);
}

function isLocalHost() {
  return ["127.0.0.1", "localhost"].includes(window.location.hostname);
}

function slugify(value) {
  return String(value || "outcome")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "outcome";
}

function parseLargeNumberInput(rawValue) {
  const normalized = String(rawValue || "").replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(parsed, 100000000000));
}

function getTrafficOpportunityInputValue() {
  if (state.annualTrafficOpportunityDraft !== "") {
    return state.annualTrafficOpportunityDraft;
  }
  if (state.annualTrafficOpportunityOverride == null) {
    return "";
  }
  return formatInteger(state.annualTrafficOpportunityOverride);
}

function getAnnualSearchVolumeInputValue() {
  if (state.annualSearchVolumeDraft !== "") {
    return state.annualSearchVolumeDraft;
  }
  if (state.annualSearchVolumeOverride == null) {
    return "";
  }
  return formatInteger(state.annualSearchVolumeOverride);
}

function getEffectiveAnnualSearchVolume() {
  if (typeof state.annualSearchVolumeOverride === "number" && !Number.isNaN(state.annualSearchVolumeOverride)) {
    return state.annualSearchVolumeOverride;
  }
  if (!state.summary) return 0;
  return state.summary.annualSearchVolume || 0;
}

function getEffectiveAnnualTrafficOpportunity(calculatedTrafficOpportunity = 0) {
  const draftOverride = parseLargeNumberInput(state.annualTrafficOpportunityDraft);
  if (typeof draftOverride === "number" && !Number.isNaN(draftOverride)) {
    return draftOverride;
  }
  if (
    typeof state.annualTrafficOpportunityOverride === "number" &&
    !Number.isNaN(state.annualTrafficOpportunityOverride)
  ) {
    return state.annualTrafficOpportunityOverride;
  }
  return calculatedTrafficOpportunity;
}

function updateSavedOutcomeDuration(outcomeId, nextValue) {
  const parsed = Number(nextValue);
  const durationWeeks = Number.isFinite(parsed)
    ? Math.max(1, Math.min(Math.round(parsed), 104))
    : DEFAULT_DURATION_WEEKS;

  const targetOutcome = state.savedOutcomes.find((outcome) => outcome.id === outcomeId);
  if (targetOutcome) {
    targetOutcome.durationWeeks = durationWeeks;
  }

  state.roadmapPlacements = state.roadmapPlacements.map((placement) =>
    placement.sourceOutcomeId === outcomeId
      ? {
          ...placement,
          snapshot: {
            ...placement.snapshot,
            durationWeeks,
          },
        }
      : placement,
  );
}

function updateRoadmapLaneName(laneId, nextName) {
  state.roadmapLanes = state.roadmapLanes.map((lane) =>
    lane.id === laneId
      ? { ...lane, name: nextName || lane.name }
      : lane,
  );
}

function addRoadmapLane() {
  const nextIndex = state.roadmapLanes.length + 1;
  state.roadmapLanes = [
    ...state.roadmapLanes,
    { id: `lane-${Date.now()}-${nextIndex}`, name: `Track ${nextIndex}` },
  ];
}

function addRoadmapQuarter() {
  state.roadmapQuarterCount = Math.min((state.roadmapQuarterCount || DEFAULT_ROADMAP_QUARTER_COUNT) + 1, 6);
}

function ensureRoadmapQuarterLabels() {
  const quarterCount = state.roadmapQuarterCount || DEFAULT_ROADMAP_QUARTER_COUNT;
  state.roadmapQuarterLabels = Array.from({ length: quarterCount }, (_, index) =>
    state.roadmapQuarterLabels?.[index] || `Quarter ${index + 1}`,
  );
}

function updateRoadmapQuarterLabel(index, nextLabel) {
  ensureRoadmapQuarterLabels();
  state.roadmapQuarterLabels[index] = nextLabel || `Quarter ${index + 1}`;
}

function hasManualTrafficOverride() {
  return getEffectiveAnnualTrafficOpportunity(null) != null;
}

function hasManualForecastInputs() {
  return (
    hasManualTrafficOverride() ||
    (typeof state.annualSearchVolumeOverride === "number" && !Number.isNaN(state.annualSearchVolumeOverride)) ||
    (typeof state.currentShareOverride === "number" && !Number.isNaN(state.currentShareOverride))
  );
}

function ensureRoadmapAssignments() {
  state.roadmapPlacements = Array.isArray(state.roadmapPlacements) ? state.roadmapPlacements : [];
  state.roadmapLanes = Array.isArray(state.roadmapLanes) && state.roadmapLanes.length
    ? state.roadmapLanes
    : [{ id: "lane-1", name: "Track 1" }];
  ensureRoadmapQuarterLabels();
  const startDate = parseMonthInputValue(state.roadmapStartMonth);
  const quarterCount = state.roadmapQuarterCount || DEFAULT_ROADMAP_QUARTER_COUNT;
  state.roadmapWeeks = buildRoadmapWeeks(quarterCount * WEEKS_PER_QUARTER, startDate);
  state.roadmapQuarters = buildRoadmapQuarters(quarterCount, startDate);
}

function ensureGroupAssignments() {
  state.groupAssignments = Object.fromEntries(
    state.pageTypes.map((pageType) => [pageType.id, state.groupAssignments[pageType.id] || []]),
  );
}

function getRoadmapQuarterById(quarterId) {
  return state.roadmapQuarters.find((quarter) => quarter.id === quarterId) || null;
}

function getRoadmapQuarterByIndex(index) {
  return state.roadmapQuarters[index] || null;
}

function getRoadmapWeekByIndex(index) {
  return state.roadmapWeeks[index] || null;
}

function getOutcomeDurationWeeks(outcome) {
  const parsed = Number(outcome?.durationWeeks);
  if (!Number.isFinite(parsed)) return DEFAULT_DURATION_WEEKS;
  return Math.max(1, Math.min(Math.round(parsed), 104));
}

function getPlacementCompletionWeekIndex(placement) {
  const startWeekIndex = Number(placement?.startWeekIndex || 0);
  const durationWeeks = getOutcomeDurationWeeks(placement?.snapshot);
  return Math.max(0, startWeekIndex + durationWeeks - 1);
}

function getPlacementCompletionDate(placement) {
  const completionWeek = getRoadmapWeekByIndex(getPlacementCompletionWeekIndex(placement));
  return completionWeek?.isoDate || null;
}

function getPlacementCompletionQuarterIndex(placement) {
  return Math.max(0, Math.floor(getPlacementCompletionWeekIndex(placement) / WEEKS_PER_QUARTER));
}

function createPlacementFromOutcomeId(outcomeId) {
  const outcome = state.savedOutcomes.find((item) => item.id === outcomeId);
  if (!outcome) return null;
  return {
    placementId: `placement-${state.nextPlacementId++}`,
    sourceOutcomeId: outcome.id,
    snapshot: structuredClone(outcome),
    laneId: state.roadmapLanes[0]?.id || "lane-1",
    startWeekIndex: 0,
  };
}

function getAssignedPageTypeId(outcomeId) {
  return Object.entries(state.groupAssignments).find(([, placements]) =>
    (placements || []).some((placement) => placement.sourceOutcomeId === outcomeId),
  )?.[0] || "";
}

function getAssignedRoadmapQuarterId(outcomeId) {
  const placement = state.roadmapPlacements.find((item) => item.sourceOutcomeId === outcomeId);
  const weekIndex = placement?.startWeekIndex || 0;
  return getRoadmapQuarterByIndex(Math.floor(weekIndex / 13))?.id || "";
}

function getAssignedPageTypeNames(outcomeId) {
  return Object.entries(state.groupAssignments)
    .filter(([, placements]) => (placements || []).some((placement) => placement.sourceOutcomeId === outcomeId))
    .map(([pageTypeId]) => state.pageTypes.find((pageType) => pageType.id === pageTypeId)?.name)
    .filter(Boolean);
}

function getAssignedRoadmapQuarterLabels(outcomeId) {
  return state.roadmapPlacements
    .filter((placement) => placement.sourceOutcomeId === outcomeId)
    .map((placement) => {
      const startWeek = getRoadmapWeekByIndex(placement.startWeekIndex);
      return startWeek ? `Week ${startWeek.weekNumber} (${getOutcomeDurationWeeks(placement.snapshot)}w)` : "";
    })
    .filter(Boolean);
}

function getAssignedOutcomes(placements) {
  return (placements || []).map((placement) => ({
    ...placement.snapshot,
    placementId: placement.placementId,
    sourceOutcomeId: placement.sourceOutcomeId,
  }));
}

function removeOutcomeFromGroupAssignments(outcomeId) {
  Object.keys(state.groupAssignments).forEach((groupId) => {
    state.groupAssignments[groupId] = (state.groupAssignments[groupId] || []).filter(
      (placement) => placement.sourceOutcomeId !== outcomeId,
    );
  });
}

function removeOutcomeFromRoadmapAssignments(outcomeId) {
  state.roadmapPlacements = state.roadmapPlacements.filter(
    (placement) => placement.sourceOutcomeId !== outcomeId,
  );
}

function removePlacementFromGroupAssignments(placementId) {
  Object.keys(state.groupAssignments).forEach((groupId) => {
    state.groupAssignments[groupId] = (state.groupAssignments[groupId] || []).filter(
      (placement) => placement.placementId !== placementId,
    );
  });
}

function removePlacementFromRoadmapAssignments(placementId) {
  state.roadmapPlacements = state.roadmapPlacements.filter(
    (placement) => placement.placementId !== placementId,
  );
}

function findGroupPlacement(placementId) {
  for (const placements of Object.values(state.groupAssignments)) {
    const found = (placements || []).find((placement) => placement.placementId === placementId);
    if (found) return found;
  }
  return null;
}

function findRoadmapPlacement(placementId) {
  return state.roadmapPlacements.find((placement) => placement.placementId === placementId) || null;
}

function assignOutcomeToGroup(payload, groupId) {
  let placement = null;
  if (payload.origin === "group" && payload.placementId) {
    placement = findGroupPlacement(payload.placementId);
    removePlacementFromGroupAssignments(payload.placementId);
  } else {
    placement = createPlacementFromOutcomeId(payload.outcomeId || payload.sourceOutcomeId);
  }
  if (!placement) return;
  state.groupAssignments[groupId] = [...(state.groupAssignments[groupId] || []), placement];
}

function assignOutcomeToRoadmapQuarter(payload, weekIndex, laneId) {
  let placement = null;
  if (payload.origin === "roadmap" && payload.placementId) {
    placement = findRoadmapPlacement(payload.placementId);
    removePlacementFromRoadmapAssignments(payload.placementId);
  } else {
    placement = createPlacementFromOutcomeId(payload.outcomeId || payload.sourceOutcomeId);
  }
  if (!placement) return;
  placement.laneId = laneId;
  placement.startWeekIndex = weekIndex;
  state.roadmapPlacements = [...state.roadmapPlacements, placement];
}

async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error("Could not reach the local predictor server. Start `python3 server.py` and open http://127.0.0.1:8000.");
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return response.json();
}

async function postJson(url, payload) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error("Could not reach the local predictor server. Start `python3 server.py` and open http://127.0.0.1:8000.");
  }
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return response.json();
}

function setStatus(message, isError = false) {
  elements.statusBanner.textContent = message;
  elements.statusBanner.dataset.state = isError ? "error" : "info";
}

function renderConnectionState() {
  elements.connectButton.disabled = state.connecting || state.previewMode;
  elements.connectButton.textContent = state.connecting
    ? "Connecting..."
    : state.previewMode
      ? state.hostedPreviewMode
        ? "Public Benchmark Mode"
        : "Preview Mode Only"
    : state.isConnected
      ? "Reconnect to Conductor"
      : "Connect to Conductor";

  elements.apiKeyInput.disabled = state.previewMode;
  elements.apiSecretInput.disabled = state.previewMode;

  const controlsDisabled = !state.isConnected;
  elements.accountSelect.disabled = controlsDisabled;
  elements.webPropertySelect.disabled = controlsDisabled;
  elements.keywordGroupSelect.disabled = controlsDisabled;

  if (!state.isConnected) {
    elements.datasetName.textContent = state.hostedPreviewMode
      ? "Bundled benchmark data"
      : "Connection needed";
    elements.datasetSummary.textContent = state.hostedPreviewMode
      ? "This public version uses built-in page-type benchmarks plus your manual inputs."
      : "Enter your Conductor API key and secret API key to load live accounts.";
  }
}

function initializeDateSelects() {
  elements.monthSelect.innerHTML = MONTH_NAMES.map(
    (month, index) => `<option value="${index}">${month}</option>`,
  ).join("");

  const startYear = new Date().getFullYear() - 1;
  const years = Array.from({ length: 6 }, (_, index) => startYear + index);
  elements.yearSelect.innerHTML = years.map((year) => `<option value="${year}">${year}</option>`).join("");

  elements.monthSelect.value = String(state.selectedMonth);
  elements.yearSelect.value = String(state.selectedYear);
}

function getSelectedGroup() {
  return state.keywordGroups.find((group) => String(group.id) === String(state.selectedGroupId));
}

function getSelectedAccount() {
  return state.accounts.find((account) => String(account.accountId) === String(state.selectedAccountId));
}

function renderAccounts() {
  elements.accountSelect.innerHTML = state.accounts.length
    ? state.accounts
        .map((account) => `<option value="${account.accountId}">${account.name}</option>`)
        .join("")
    : '<option value="">Connect to load accounts</option>';
  elements.accountSelect.value = state.selectedAccountId;
}

function renderWebProperties() {
  elements.webPropertySelect.innerHTML = state.webProperties.length
    ? state.webProperties
        .map(
          (webProperty) =>
            `<option value="${webProperty.webPropertyId}">${webProperty.name}</option>`,
        )
        .join("")
    : '<option value="">Select an account first</option>';
  elements.webPropertySelect.value = state.selectedWebPropertyId;
}

function renderKeywordGroups() {
  elements.keywordGroupSelect.innerHTML = state.keywordGroups.length
    ? state.keywordGroups
        .map(
          (group) =>
            `<option value="${group.id}">${group.name} (${formatInteger(group.keywordCount)} kws)</option>`,
        )
        .join("")
    : '<option value="">Select a web property first</option>';
  elements.keywordGroupSelect.value = state.selectedGroupId;
}

function renderPageTypes() {
  elements.pageTypes.innerHTML = state.pageTypes
    .map(
      (pageType) => `
        <label class="checkbox-card">
          <input type="radio" name="pageType" value="${pageType.id}" ${
            state.selectedPageTypes.includes(pageType.id) ? "checked" : ""
          } />
          <span>${pageType.name}</span>
        </label>
      `,
    )
    .join("");

  elements.pageTypes.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      state.selectedPageTypes = [radio.value];
      renderForecast();
    });
  });
}

function renderMetricInputs() {
  const baselineShare = getEffectiveCurrentShare();
  elements.metricInputs.innerHTML = `
    <div class="metric-input-row">
      <label for="annualSearchVolumeInput">
        Annual Search Volume Override
        <span class="small-note">Leave blank to use the Conductor annual search volume.</span>
      </label>
      <input
        id="annualSearchVolumeInput"
        type="text"
        inputmode="numeric"
        placeholder="e.g. 250,000,000"
        value="${getAnnualSearchVolumeInputValue()}"
      />
    </div>
    <div class="metric-input-row">
      <label for="currentShareInput">
        Current Chewy Market Share
        <span class="small-note">Use your validated share when Conductor live share is unavailable.</span>
      </label>
      <input id="currentShareInput" type="number" step="0.01" min="0" max="100" value="${baselineShare}" />
    </div>
    <div class="metric-input-row">
      <label for="trafficOpportunityInput">
        Estimated Traffic Override
        <span class="small-note">Leave blank to use the model's calculated annual traffic opportunity.</span>
      </label>
      <input
        id="trafficOpportunityInput"
        type="text"
        inputmode="numeric"
        pattern="[0-9,]*"
        maxlength="14"
        autocomplete="off"
        spellcheck="false"
        placeholder="e.g. 125,000,000"
        value="${getTrafficOpportunityInputValue()}"
      />
    </div>
    <div class="metric-input-row">
      <label for="shareLiftInput">
        Estimated Market Share Lift
        <span class="small-note">Baseline ${formatPercent(baselineShare)}</span>
      </label>
      <input id="shareLiftInput" type="number" step="0.1" min="0" value="${state.shareLift || 4}" />
    </div>
  `;

  const currentShareInput = document.querySelector("#currentShareInput");
  const commitCurrentShareOverride = (event) => {
    state.currentShareOverride = Number(event.target.value || 0);
    renderForecast();
  };
  currentShareInput.addEventListener("input", commitCurrentShareOverride);
  currentShareInput.addEventListener("change", commitCurrentShareOverride);

  const annualSearchVolumeInput = document.querySelector("#annualSearchVolumeInput");
  const commitAnnualSearchVolumeOverride = () => {
    state.annualSearchVolumeOverride = parseLargeNumberInput(annualSearchVolumeInput.value);
    state.annualSearchVolumeDraft = "";
    renderForecast();
  };
  annualSearchVolumeInput.addEventListener("input", (event) => {
    state.annualSearchVolumeDraft = event.target.value;
  });
  annualSearchVolumeInput.addEventListener("change", commitAnnualSearchVolumeOverride);
  annualSearchVolumeInput.addEventListener("blur", commitAnnualSearchVolumeOverride);
  annualSearchVolumeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      annualSearchVolumeInput.blur();
    }
  });

  const trafficOpportunityInput = document.querySelector("#trafficOpportunityInput");
  const commitTrafficOpportunityOverride = () => {
    state.annualTrafficOpportunityOverride = parseLargeNumberInput(trafficOpportunityInput.value);
    state.annualTrafficOpportunityDraft = "";
    renderForecast();
  };
  trafficOpportunityInput.addEventListener("input", (event) => {
    state.annualTrafficOpportunityDraft = event.target.value;
  });
  trafficOpportunityInput.addEventListener("change", commitTrafficOpportunityOverride);
  trafficOpportunityInput.addEventListener("blur", commitTrafficOpportunityOverride);
  trafficOpportunityInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      trafficOpportunityInput.blur();
    }
  });

  const shareLiftInput = document.querySelector("#shareLiftInput");
  const commitShareLift = (event) => {
    state.shareLift = Number(event.target.value || 0);
    renderForecast();
  };
  shareLiftInput.addEventListener("input", commitShareLift);
  shareLiftInput.addEventListener("change", commitShareLift);
}

function calculateConservativeProjectedShare(baselineShare, rawShareLift, impactFactor) {
  const dampenedImpact = Math.max(impactFactor, 0) * 0.45;
  const projectedLift = rawShareLift * dampenedImpact;
  return Math.min(baselineShare + projectedLift, 100);
}

function getDeploymentOffset() {
  const current = new Date();
  const currentMonthIndex = current.getFullYear() * 12 + current.getMonth();
  const deploymentMonthIndex = state.selectedYear * 12 + state.selectedMonth;
  return Math.max(0, Math.min(deploymentMonthIndex - currentMonthIndex, FORECAST_MONTHS - 1));
}

function getFrontLoadedProgress() {
  const offset = getDeploymentOffset();
  const ramp = [0, 0.18, 0.44, 0.7, 0.84, 0.93, 0.985, 1];
  return Array.from({ length: FORECAST_MONTHS }, (_, index) => {
    const rampIndex = index - offset;
    if (rampIndex < 0) return 0;
    if (rampIndex >= ramp.length) return 1;
    return ramp[rampIndex];
  });
}

function calculateFrontLoadedSeries(baseline, endingValue, preDeploymentValue = baseline) {
  const totalLift = endingValue - baseline;
  return getFrontLoadedProgress().map((progress) =>
    progress === 0 ? preDeploymentValue : baseline + totalLift * progress,
  );
}

function calculateTrafficOpportunitySeries(totalTrafficOpportunity) {
  const peakMonthlyTraffic = totalTrafficOpportunity / 12;
  return getFrontLoadedProgress().map((progress) => peakMonthlyTraffic * progress);
}

function renderSummaryCards() {
  const summary = state.summary;
  if (!summary) {
    const annualSearchVolume = getEffectiveAnnualSearchVolume();
    const baselineShare = getEffectiveCurrentShare();
    const projectedShare = calculateConservativeProjectedShare(
      baselineShare,
      state.shareLift || 4,
      1,
    );
    const selectedPageTypeMetrics = getBlendedPageTypeMetrics();
    const selectedCtr = (selectedPageTypeMetrics["Click through rate"]?.value || 0) / 100;
    const attainableShareDelta = Math.max(projectedShare - baselineShare, 0) / 100;
    const calculatedTrafficOpportunity = annualSearchVolume * attainableShareDelta * selectedCtr;
    const manualTraffic = getEffectiveAnnualTrafficOpportunity(calculatedTrafficOpportunity);
    elements.annualSearchVolume.textContent = formatInteger(annualSearchVolume);
    elements.currentShare.textContent = formatPercent(baselineShare);
    elements.projectedShare.textContent = formatPercent(projectedShare);
    elements.projectedTraffic.textContent = formatInteger(manualTraffic);
    elements.shareStatus.textContent = "";
    return;
  }

  const baselineShare = getEffectiveCurrentShare();
  const annualSearchVolume = getEffectiveAnnualSearchVolume();
  const endingShare = calculateConservativeProjectedShare(
    baselineShare,
    state.shareLift || 4,
    1,
  );
  const selectedPageTypeMetrics = getBlendedPageTypeMetrics();
  const selectedCtr = (selectedPageTypeMetrics["Click through rate"]?.value || 0) / 100;
  const attainableShareDelta = Math.max(endingShare - baselineShare, 0) / 100;
  const calculatedTrafficOpportunity = annualSearchVolume * attainableShareDelta * selectedCtr;
  const endingTraffic = getEffectiveAnnualTrafficOpportunity(calculatedTrafficOpportunity);

  elements.annualSearchVolume.textContent = formatInteger(annualSearchVolume);
  elements.currentShare.textContent = formatPercent(baselineShare);
  elements.projectedShare.textContent = formatPercent(endingShare);
  elements.projectedTraffic.textContent = formatInteger(endingTraffic);
  elements.shareStatus.textContent = getShareStatusMessage();
}

function renderForecast() {
  renderSummaryCards();
  renderMetricInputs();

  const summary = state.summary;
  if (!summary && !hasManualForecastInputs()) {
    elements.forecastHead.innerHTML = "";
    elements.forecastBody.innerHTML = "";
    state.currentOutcome = null;
    renderOutcomeBoard();
    return;
  }

  const blendedMetrics = getBlendedPageTypeMetrics();
  const baselineShare = getEffectiveCurrentShare();
  const annualSearchVolume = getEffectiveAnnualSearchVolume();
  const projectedShare = calculateConservativeProjectedShare(
    baselineShare,
    state.shareLift || 4,
    1,
  );
  const selectedCtr = (blendedMetrics["Click through rate"]?.value || 0) / 100;
  const attainableShareDelta = Math.max(projectedShare - baselineShare, 0) / 100;
  const calculatedTrafficOpportunity =
    annualSearchVolume * attainableShareDelta * selectedCtr;
  const annualTrafficOpportunity = getEffectiveAnnualTrafficOpportunity(calculatedTrafficOpportunity);
  const shareSeries = calculateFrontLoadedSeries(baselineShare, projectedShare, baselineShare);
  const trafficSeries = calculateTrafficOpportunitySeries(annualTrafficOpportunity);
  const projectedTraffic = trafficSeries[trafficSeries.length - 1] || 0;
  const revenueSeries = trafficSeries.map((traffic) => traffic * (blendedMetrics.RPS?.value || 0));
  const ordersSeries = trafficSeries.map(
    (traffic) => traffic * ((blendedMetrics["Order Conversion Rate"]?.value || 0) / 100),
  );
  const acquisitionsSeries = trafficSeries.map(
    (traffic) => traffic * ((blendedMetrics["Acquisition Conversion Rate"]?.value || 0) / 100),
  );
  const selectedPageType = state.pageTypes.find((pageType) => state.selectedPageTypes.includes(pageType.id));
  const revenueTotal = revenueSeries.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const ordersTotal = ordersSeries.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const acquisitionsTotal = acquisitionsSeries.reduce((sum, value) => sum + (Number(value) || 0), 0);

  state.currentOutcome = {
    groupId: state.selectedGroupId,
    groupName: getSelectedGroup()?.name || "Manual forecast project",
    pageTypeId: selectedPageType?.id || "",
    pageTypeName: selectedPageType?.name || "Unassigned page type",
    durationWeeks: state.currentOutcome?.durationWeeks || DEFAULT_DURATION_WEEKS,
    annualSearchVolume,
    currentShare: baselineShare,
    projectedShare,
    annualTrafficOpportunity,
    revenueTotal,
    ordersTotal,
    acquisitionsTotal,
  };

  const rows = [
    {
      name: "Estimated Market Share",
      unit: "%",
      baseline: baselineShare,
      series: shareSeries,
      projected: projectedShare,
    },
    {
      name: "Monthly Organic Traffic Opportunity",
      unit: "visits",
      baseline: 0,
      series: trafficSeries,
      projected: projectedTraffic,
    },
    {
      name: "Gross Revenue",
      unit: "$",
      baseline: 0,
      series: revenueSeries,
      projected: revenueSeries[revenueSeries.length - 1] || 0,
    },
    {
      name: "Projected Orders",
      unit: "number",
      baseline: 0,
      series: ordersSeries,
      projected: ordersSeries[ordersSeries.length - 1] || 0,
    },
    {
      name: "Projected Acquisitions",
      unit: "number",
      baseline: 0,
      series: acquisitionsSeries,
      projected: acquisitionsSeries[acquisitionsSeries.length - 1] || 0,
    },
    ...Object.entries(blendedMetrics).map(([metricKey, metric]) => ({
      name: KPI_LABELS[metricKey] || metricKey,
      unit: metric.unit,
      baseline: metric.value,
      series: Array.from({ length: FORECAST_MONTHS }, () => metric.value),
      projected: metric.value,
    })),
  ];

  const headerCells = [
    "<th>Metric</th>",
    "<th>Baseline</th>",
    ...Array.from({ length: FORECAST_MONTHS }, (_, monthIndex) => {
      const current = new Date();
      const date = new Date(current.getFullYear(), current.getMonth() + monthIndex, 1);
      return `<th>${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${String(date.getFullYear()).slice(-2)}</th>`;
    }),
    "<th>24-mo total</th>",
  ];
  elements.forecastHead.innerHTML = `<tr>${headerCells.join("")}</tr>`;

  elements.forecastBody.innerHTML = rows
    .map((metric) => {
      const series = metric.series || Array.from({ length: FORECAST_MONTHS }, () => metric.projected);
      const totalOverYear = series.reduce((sum, value) => sum + (Number(value) || 0), 0);
      return `
        <tr>
          <td>${metric.name}</td>
          <td>${formatMetricValue(metric.baseline, metric.unit)}</td>
          ${series
            .map((value) => `<td>${formatMetricValue(value, metric.unit)}</td>`)
            .join("")}
          <td>${formatMetricValue(totalOverYear, metric.unit)}</td>
        </tr>
      `;
    })
    .join("");

  renderOutcomeBoard();
}

async function loadAccounts() {
  setStatus("Loading Conductor accounts...");
  const payload = await fetchJson("/api/accounts");
  state.accounts = payload.accounts;
  const preferredAccount =
    payload.accounts.find((account) => account.name === "Chewy - Experiments") || payload.accounts[0];
  state.selectedAccountId = preferredAccount?.accountId || "";
  renderAccounts();
}

async function connectToConductor() {
  if (state.previewMode) {
    setStatus(
      state.hostedPreviewMode
        ? "This public version runs in benchmark mode only. Use the local app with `python3 server.py` for live Conductor access."
        : "Preview mode is using bundled benchmark data. Live Conductor connection is unavailable on this preview server.",
    );
    return;
  }
  const apiKey = state.apiKey.trim();
  const apiSecret = state.apiSecret.trim();
  if (!apiKey || !apiSecret) {
    setStatus("Enter both the API key and secret API key to connect.", true);
    return;
  }

  try {
    state.connecting = true;
    renderConnectionState();
    setStatus("Connecting to Conductor...");
    const payload = await postJson("/api/connect", { apiKey, apiSecret });
    state.isConnected = Boolean(payload.connected);
    await loadAccounts();
    await loadWebProperties();
    await loadKeywordGroups();
    await refreshGroupData();
    setStatus("Live Conductor data loaded.");
  } catch (error) {
    state.isConnected = false;
    state.accounts = [];
    state.webProperties = [];
    state.keywordGroups = [];
    state.selectedAccountId = "";
    state.selectedWebPropertyId = "";
    state.selectedGroupId = "";
    state.summary = null;
    renderAccounts();
    renderWebProperties();
    renderKeywordGroups();
    renderForecast();
    setStatus(error.message, true);
  } finally {
    state.connecting = false;
    renderConnectionState();
  }
}

async function loadPageTypes() {
  let pageTypes;
  try {
    const payload = await fetchJson("/api/page-type-metrics");
    pageTypes = payload.pageTypes;
  } catch (error) {
    pageTypes = FALLBACK_PAGE_TYPES;
    state.previewMode = true;
    state.hostedPreviewMode = !isLocalHost();
    setStatus(
      state.hostedPreviewMode
        ? "Public benchmark mode loaded with bundled page-type data."
        : "Running in local preview mode with bundled benchmark data.",
    );
  }

  state.pageTypes = pageTypes.map((pageType) => ({
    ...pageType,
    impactWeight: pageType.metrics.IMPRESSIONS?.value || pageType.impactWeight || 1,
    shareGainMultiplier: 1,
  }));
  state.selectedPageTypes = state.pageTypes[0] ? [state.pageTypes[0].id] : [];
  ensureGroupAssignments();
  ensureRoadmapAssignments();
  renderPageTypes();
  renderOutcomeBoard();
}

async function loadWebProperties() {
  if (!state.selectedAccountId) {
    return;
  }
  setStatus("Loading web properties...");
  const payload = await fetchJson(`/api/accounts/${state.selectedAccountId}/web-properties`);
  state.webProperties = payload.webProperties;
  const chewyProperty =
    payload.webProperties.find((webProperty) => webProperty.name === "chewy.com") || payload.webProperties[0];
  state.selectedWebPropertyId = chewyProperty?.webPropertyId || "";
  renderWebProperties();
}

async function loadKeywordGroups() {
  if (!state.selectedAccountId) {
    return;
  }
  setStatus("Loading keyword groups...");
  const payload = await fetchJson(`/api/accounts/${state.selectedAccountId}/keyword-groups`);
  state.keywordGroups = payload.keywordGroups;
  state.selectedGroupId = payload.keywordGroups[0]?.id || "";
  renderKeywordGroups();
}

async function loadSummary() {
  if (!state.selectedAccountId || !state.selectedWebPropertyId || !state.selectedGroupId) {
    return;
  }

  const params = new URLSearchParams({
    accountId: state.selectedAccountId,
    webPropertyId: state.selectedWebPropertyId,
    keywordGroupId: state.selectedGroupId,
  });
  setStatus("Loading annual search volume and current share...");
  state.summary = await fetchJson(`/api/group-summary?${params.toString()}`);
  state.currentShareOverride = state.summary.currentShareAvailable ? state.summary.currentShare : state.currentShareOverride;
  elements.datasetName.textContent = getSelectedAccount()?.name || "Conductor";
  elements.datasetSummary.textContent = `${state.keywordGroups.length} live keyword groups`;
  setStatus("Live Conductor data loaded.");
  renderForecast();
}

async function refreshGroupData() {
  try {
    state.loading = true;
    state.error = "";
    await loadSummary();
  } catch (error) {
    state.error = error.message;
    setStatus(error.message, true);
  } finally {
    state.loading = false;
  }
}

function summarizeAssignedOutcomes(outcomes) {
  return outcomes.reduce(
    (summary, outcome) => {
      summary.count += 1;
      summary.annualSearchVolume += outcome.annualSearchVolume || 0;
      summary.annualTrafficOpportunity += outcome.annualTrafficOpportunity || 0;
      summary.revenueTotal += outcome.revenueTotal || 0;
      summary.ordersTotal += outcome.ordersTotal || 0;
      summary.acquisitionsTotal += outcome.acquisitionsTotal || 0;
      return summary;
    },
    {
      count: 0,
      annualSearchVolume: 0,
      annualTrafficOpportunity: 0,
      revenueTotal: 0,
      ordersTotal: 0,
      acquisitionsTotal: 0,
    },
  );
}

function buildEmptySummaryTotals() {
  return {
    count: 0,
    annualSearchVolume: 0,
    annualTrafficOpportunity: 0,
    revenueTotal: 0,
    ordersTotal: 0,
    acquisitionsTotal: 0,
  };
}

function summarizeRenderedRoadmapBars() {
  const summaryByQuarter = state.roadmapQuarters.map(() => buildEmptySummaryTotals());
  const totalWeeks = Math.max(1, state.roadmapWeeks.length);

  document.querySelectorAll(".roadmap-bar").forEach((bar) => {
    const placementId = bar.dataset.placementId;
    const placement = state.roadmapPlacements.find((item) => item.placementId === placementId);
    const grid = bar.closest(".roadmap-lane-grid");
    if (!placement || !grid || !grid.clientWidth) return;

    const rightEdge = bar.offsetLeft + bar.offsetWidth - 1;
    const endWeekIndex = Math.max(
      0,
      Math.min(Math.floor((rightEdge / grid.clientWidth) * totalWeeks), totalWeeks - 1),
    );
    const quarterIndex = Math.max(0, Math.min(Math.floor(endWeekIndex / WEEKS_PER_QUARTER), summaryByQuarter.length - 1));
    const target = summaryByQuarter[quarterIndex];

    target.count += 1;
    target.annualSearchVolume += placement.snapshot.annualSearchVolume || 0;
    target.annualTrafficOpportunity += placement.snapshot.annualTrafficOpportunity || 0;
    target.revenueTotal += placement.snapshot.revenueTotal || 0;
    target.ordersTotal += placement.snapshot.ordersTotal || 0;
    target.acquisitionsTotal += placement.snapshot.acquisitionsTotal || 0;
  });

  return summaryByQuarter;
}

function updateRoadmapQuarterSummaryDisplay() {
  const summaryByQuarter = summarizeRenderedRoadmapBars();
  document.querySelectorAll("[data-roadmap-quarter-summary-index]").forEach((tile) => {
    const index = Number(tile.dataset.roadmapQuarterSummaryIndex);
    const totals = summaryByQuarter[index] || buildEmptySummaryTotals();
    const trafficNode = tile.querySelector("[data-quarter-traffic]");
    const revenueNode = tile.querySelector("[data-quarter-revenue]");
    const acquisitionsNode = tile.querySelector("[data-quarter-acquisitions]");
    if (trafficNode) trafficNode.textContent = formatInteger(totals.annualTrafficOpportunity);
    if (revenueNode) revenueNode.textContent = formatMetricValue(totals.revenueTotal, "$");
    if (acquisitionsNode) acquisitionsNode.textContent = formatInteger(totals.acquisitionsTotal);
  });
}

function buildCurrentOutcomePreview() {
  if (!state.currentOutcome) {
    return '<p class="small-note">Select live data and page type inputs to generate a project card preview.</p>';
  }

  return `
    <article class="current-outcome-preview">
      <div class="current-outcome-preview-header">
        <div>
          <strong>Current forecast preview</strong>
          <p class="small-note">${state.currentOutcome.groupName}</p>
        </div>
        <span class="quarter-chip">Modeled on ${state.currentOutcome.pageTypeName}</span>
      </div>
      <dl class="outcome-stats detailed">
        <div><dt>Annual SV</dt><dd>${formatInteger(state.currentOutcome.annualSearchVolume || 0)}</dd></div>
        <div><dt>Traffic opp</dt><dd>${formatInteger(state.currentOutcome.annualTrafficOpportunity || 0)}</dd></div>
        <div><dt>Revenue</dt><dd>${formatMetricValue(state.currentOutcome.revenueTotal || 0, "$")}</dd></div>
        <div><dt>Acq.</dt><dd>${formatInteger(state.currentOutcome.acquisitionsTotal || 0)}</dd></div>
        <div><dt>Duration</dt><dd>${getOutcomeDurationWeeks(state.currentOutcome)} weeks</dd></div>
      </dl>
    </article>
  `;
}

function buildOutcomeCard(outcome, options = {}) {
  const draggable = options.draggable ? 'draggable="true"' : "";
  const compactClass = options.compact ? " compact" : "";
  const roadmapClass = options.roadmap ? " roadmap-card" : "";
  const assignedPageType = options.assignedPageTypeName
    ? { name: options.assignedPageTypeName }
    : state.pageTypes.find((pageType) => pageType.id === getAssignedPageTypeId(outcome.id));
  const quarter = options.assignedQuarterLabel
    ? { label: options.assignedQuarterLabel }
    : getRoadmapQuarterById(getAssignedRoadmapQuarterId(outcome.id));
  const dragOrigin = options.dragOrigin || "tray";
  const placementId = options.placementId || "";
  const durationWeeks = getOutcomeDurationWeeks(outcome);

  return `
    <article class="outcome-card${compactClass}${roadmapClass}" ${draggable} data-outcome-id="${outcome.id || outcome.sourceOutcomeId || ""}" data-drag-origin="${dragOrigin}" data-placement-id="${placementId}">
      <div class="outcome-card-header">
        <div class="outcome-card-title-block">
          <strong>${outcome.groupName}</strong>
          <span class="small-note outcome-card-meta">${assignedPageType?.name || outcome.pageTypeName}</span>
        </div>
        <div class="card-actions">
          ${options.draggable ? '<span class="quarter-chip">Drag card</span>' : ""}
          ${quarter ? `<span class="quarter-chip">${quarter.label}</span>` : ""}
          ${options.showDelete ? `<button type="button" class="delete-outcome-button" aria-label="Delete card" data-delete-outcome-id="${outcome.id || ""}">&times;</button>` : ""}
        </div>
      </div>
      <dl class="outcome-stats ${options.compact ? "" : "detailed"}">
        <div><dt>Annual SV</dt><dd>${formatInteger(outcome.annualSearchVolume || 0)}</dd></div>
        <div><dt>Traffic opp</dt><dd>${formatInteger(outcome.annualTrafficOpportunity || 0)}</dd></div>
        <div><dt>Revenue</dt><dd>${formatMetricValue(outcome.revenueTotal || 0, "$")}</dd></div>
        <div><dt>Acq.</dt><dd>${formatInteger(outcome.acquisitionsTotal || 0)}</dd></div>
        ${
          options.editableWeeks
            ? `<div class="duration-editor"><dt>Duration</dt><dd><input class="duration-input" type="number" min="1" max="104" value="${durationWeeks}" data-duration-outcome-id="${outcome.id || ""}" /> <span class="small-note">weeks</span></dd></div>`
            : `<div><dt>Duration</dt><dd>${durationWeeks} weeks</dd></div>`
        }
      </dl>
    </article>
  `;
}

function readDragPayload(event) {
  const rawJson = event.dataTransfer.getData("application/json");
  if (rawJson) {
    try {
      return JSON.parse(rawJson);
    } catch {
      return null;
    }
  }

  const outcomeId = event.dataTransfer.getData("text/plain");
  return outcomeId ? { outcomeId } : null;
}

function renderOutcomeBoard() {
  ensureGroupAssignments();
  ensureRoadmapAssignments();

  elements.currentOutcomeCard.innerHTML = buildCurrentOutcomePreview();

  elements.outcomeTray.innerHTML = state.savedOutcomes.length
    ? state.savedOutcomes
        .map((outcome) =>
          buildOutcomeCard(outcome, {
            draggable: true,
            showDelete: true,
            editableWeeks: true,
            dragOrigin: "tray",
          }),
        )
        .join("")
    : '<p class="small-note">No saved projects yet. Click "Add Current Outcome" to create one.</p>';

  elements.groupBoard.innerHTML = state.pageTypes
    .map((pageType) => {
      const assignedOutcomes = getAssignedOutcomes(state.groupAssignments[pageType.id] || []);
      const totals = summarizeAssignedOutcomes(assignedOutcomes);
      return `
        <section class="group-zone" data-group-id="${pageType.id}">
          <div class="group-zone-header">
            <div>
              <h4>${pageType.name}</h4>
              <p class="small-note">${totals.count} project${totals.count === 1 ? "" : "s"}</p>
            </div>
            <div class="group-zone-totals">
              <span>${formatInteger(totals.annualTrafficOpportunity)} traffic</span>
              <span>${formatMetricValue(totals.revenueTotal, "$")} revenue</span>
              <span>${formatInteger(totals.acquisitionsTotal)} acquisitions</span>
            </div>
          </div>
          <div class="group-zone-body">
            ${assignedOutcomes.length
              ? assignedOutcomes
                  .map((outcome) => buildOutcomeCard(outcome, {
                    compact: true,
                    draggable: true,
                    dragOrigin: "group",
                    placementId: outcome.placementId,
                    assignedPageTypeName: pageType.name,
                  }))
                  .join("")
              : '<p class="small-note">Drop projects here.</p>'}
          </div>
        </section>
      `;
    })
    .join("");

  const roadmapStartMonthOptions = buildRoadmapStartMonthOptions(state.roadmapStartMonth);

  elements.roadmapBoard.innerHTML = `
    <section class="roadmap-chart">
      <div class="roadmap-chart-header">
        <div class="roadmap-corner"></div>
        <div class="roadmap-week-track">
          ${state.roadmapWeeks
            .map(
              (week) => `
                <div class="roadmap-week-label">
                  <span>${week.label}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
      <div class="roadmap-summary-row">
        <div class="roadmap-summary-label">
          <strong>Quarter totals</strong>
          <label class="roadmap-start-field">
            <span>Roadmap timeline</span>
            <select id="roadmapStartMonthInput">
              ${roadmapStartMonthOptions
                .map(
                  (option) =>
                    `<option value="${option.value}" ${option.value === state.roadmapStartMonth ? "selected" : ""}>${option.label}</option>`,
                )
                .join("")}
            </select>
          </label>
          <button id="addRoadmapLaneButton" type="button" class="action-button secondary">Add Row</button>
          <button id="addRoadmapQuarterButton" type="button" class="action-button secondary" ${state.roadmapQuarterCount >= 6 ? "disabled" : ""}>Add Quarter</button>
        </div>
        <div class="roadmap-quarter-track">
          ${state.roadmapQuarters
            .map(
              (_, index) => `
                <dl class="roadmap-quarter-summary" data-roadmap-quarter-summary-index="${index}">
                  <div class="roadmap-quarter-title">
                    <input
                      type="text"
                      value="${state.roadmapQuarterLabels[index] || `Quarter ${index + 1}`}"
                      data-roadmap-quarter-label-index="${index}"
                    />
                  </div>
                  <div><dt>Traffic</dt><dd data-quarter-traffic>0</dd></div>
                  <div><dt>Revenue</dt><dd data-quarter-revenue>$0.00</dd></div>
                  <div><dt>Acq.</dt><dd data-quarter-acquisitions>0</dd></div>
                </dl>
              `,
            )
            .join("")}
        </div>
      </div>
      <div class="roadmap-lanes">
        ${state.roadmapLanes.map((lane) => {
          const lanePlacements = state.roadmapPlacements.filter((placement) => placement.laneId === lane.id);
          const laneRowCount = Math.max(lanePlacements.length, 1);
          return `
            <div class="roadmap-lane-row">
              <label class="roadmap-lane-label">
                <input type="text" value="${lane.name}" data-roadmap-lane-id="${lane.id}" />
              </label>
              <div class="roadmap-lane-grid" data-roadmap-lane-grid="${lane.id}" style="--lane-bar-count: ${laneRowCount};">
                <div class="roadmap-week-track roadmap-week-track-grid">
                  ${state.roadmapWeeks
                    .map(
                      (week) => `
                        <div class="roadmap-week-label roadmap-week-label-grid">
                          <span>${week.monthLabel} ${week.dayOfMonth}</span>
                        </div>
                      `,
                    )
                    .join("")}
                </div>
                ${state.roadmapWeeks
                  .map(
                    (_, weekIndex) => `
                      <div
                        class="roadmap-drop-cell"
                      ></div>
                    `,
                  )
                  .join("")}
                ${lanePlacements
                  .map((placement, placementIndex) => {
                    const startWeek = getRoadmapWeekByIndex(placement.startWeekIndex || 0);
                    const durationWeeks = getOutcomeDurationWeeks(placement.snapshot);
                    const spanWeeks = Math.max(durationWeeks, 1);
                    return `
                      <article
                        class="roadmap-bar"
                        draggable="true"
                        data-outcome-id="${placement.sourceOutcomeId}"
                        data-drag-origin="roadmap"
                        data-placement-id="${placement.placementId}"
                        style="left: calc(${placement.startWeekIndex || 0} * var(--roadmap-week-width) + 4px); width: calc(${spanWeeks} * var(--roadmap-week-width) - 8px); top: calc(34px + ${placementIndex} * 72px);"
                      >
                        <div class="roadmap-bar-main">
                          <strong>${placement.snapshot.groupName}</strong>
                          <span>Week ${startWeek?.weekNumber || 1} • ${durationWeeks} weeks</span>
                        </div>
                        <div class="roadmap-bar-meta">
                          <span>${placement.snapshot.pageTypeName}</span>
                          <span>${formatInteger(placement.snapshot.annualTrafficOpportunity || 0)} traffic</span>
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;

  document.querySelectorAll("[data-outcome-id]").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      const payload = {
        outcomeId: card.dataset.outcomeId,
        origin: card.dataset.dragOrigin || "tray",
        placementId: card.dataset.placementId || "",
        sourceOutcomeId: card.dataset.outcomeId,
      };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/json", JSON.stringify(payload));
      event.dataTransfer.setData("text/plain", card.dataset.outcomeId);
    });
  });

  document.querySelectorAll("[data-delete-outcome-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const outcomeId = button.dataset.deleteOutcomeId;
      state.savedOutcomes = state.savedOutcomes.filter((outcome) => outcome.id !== outcomeId);
      renderOutcomeBoard();
    });
  });

  document.querySelectorAll("[data-duration-outcome-id]").forEach((input) => {
    const commitDuration = () => {
      updateSavedOutcomeDuration(input.dataset.durationOutcomeId, input.value);
      renderOutcomeBoard();
    };
    input.addEventListener("change", commitDuration);
    input.addEventListener("blur", commitDuration);
  });

  const roadmapStartMonthInput = document.querySelector("#roadmapStartMonthInput");
  if (roadmapStartMonthInput) {
    const commitRoadmapStartMonth = () => {
      state.roadmapStartMonth = roadmapStartMonthInput.value || formatMonthInputValue(new Date());
      renderOutcomeBoard();
    };
    roadmapStartMonthInput.addEventListener("change", commitRoadmapStartMonth);
    roadmapStartMonthInput.addEventListener("blur", commitRoadmapStartMonth);
  }

  const addRoadmapLaneButton = document.querySelector("#addRoadmapLaneButton");
  if (addRoadmapLaneButton) {
    addRoadmapLaneButton.addEventListener("click", () => {
      addRoadmapLane();
      renderOutcomeBoard();
    });
  }

  const addRoadmapQuarterButton = document.querySelector("#addRoadmapQuarterButton");
  if (addRoadmapQuarterButton) {
    addRoadmapQuarterButton.addEventListener("click", () => {
      addRoadmapQuarter();
      renderOutcomeBoard();
    });
  }

  document.querySelectorAll("[data-roadmap-lane-id]").forEach((input) => {
    if (input.tagName !== "INPUT") return;
    const commitLaneName = () => {
      updateRoadmapLaneName(input.dataset.roadmapLaneId, input.value.trim());
      renderOutcomeBoard();
    };
    input.addEventListener("change", commitLaneName);
    input.addEventListener("blur", commitLaneName);
  });

  document.querySelectorAll("[data-roadmap-quarter-label-index]").forEach((input) => {
    const commitQuarterLabel = () => {
      updateRoadmapQuarterLabel(Number(input.dataset.roadmapQuarterLabelIndex), input.value.trim());
      renderOutcomeBoard();
    };
    input.addEventListener("change", commitQuarterLabel);
    input.addEventListener("blur", commitQuarterLabel);
  });

  elements.outcomeTray.ondragover = (event) => {
    event.preventDefault();
    elements.outcomeTray.classList.add("drag-over");
  };
  elements.outcomeTray.ondragleave = () => {
    elements.outcomeTray.classList.remove("drag-over");
  };
  elements.outcomeTray.ondrop = (event) => {
    event.preventDefault();
    elements.outcomeTray.classList.remove("drag-over");
    const payload = readDragPayload(event);
    if (!payload) return;
    if (payload.origin === "group" && payload.placementId) {
      removePlacementFromGroupAssignments(payload.placementId);
    }
    if (payload.origin === "roadmap" && payload.placementId) {
      removePlacementFromRoadmapAssignments(payload.placementId);
    }
    renderOutcomeBoard();
  };

  elements.groupBoard.querySelectorAll(".group-zone").forEach((zone) => {
    zone.ondragover = (event) => {
      event.preventDefault();
      zone.classList.add("drag-over");
    };
    zone.ondragleave = () => {
      zone.classList.remove("drag-over");
    };
    zone.ondrop = (event) => {
      event.preventDefault();
      zone.classList.remove("drag-over");
      const payload = readDragPayload(event);
      if (!payload) return;
      assignOutcomeToGroup(payload, zone.dataset.groupId);
      renderOutcomeBoard();
    };
  });

  elements.roadmapBoard.querySelectorAll("[data-roadmap-lane-grid]").forEach((grid) => {
    grid.ondragover = (event) => {
      event.preventDefault();
      grid.classList.add("drag-over");
    };
    grid.ondragleave = () => {
      grid.classList.remove("drag-over");
    };
    grid.ondrop = (event) => {
      event.preventDefault();
      grid.classList.remove("drag-over");
      const payload = readDragPayload(event);
      if (!payload) return;
      assignOutcomeToRoadmapQuarter(
        payload,
        getRoadmapWeekIndexFromPointer(event, grid),
        grid.dataset.roadmapLaneGrid,
      );
      renderOutcomeBoard();
    };
  });

  requestAnimationFrame(() => {
    updateRoadmapQuarterSummaryDisplay();
  });
}

function exportOutcomeData() {
  const rows = state.savedOutcomes.map((outcome) => {
    const assignedPageTypes = getAssignedPageTypeNames(outcome.id);
    const assignedQuarters = getAssignedRoadmapQuarterLabels(outcome.id);

    return {
      keyword_group: outcome.groupName,
      modeled_page_type: outcome.pageTypeName,
      catalog_page_type_group: assignedPageTypes.join(" | "),
      roadmap_quarter: assignedQuarters.join(" | "),
      annual_search_volume: outcome.annualSearchVolume || 0,
      current_share_percent: outcome.currentShare || 0,
      projected_share_percent: outcome.projectedShare || 0,
      annual_traffic_opportunity: outcome.annualTrafficOpportunity || 0,
      duration_weeks: getOutcomeDurationWeeks(outcome),
      revenue_24mo_total: Math.round(outcome.revenueTotal || 0),
      orders_24mo_total: Math.round(outcome.ordersTotal || 0),
      acquisitions_24mo_total: Math.round(outcome.acquisitionsTotal || 0),
    };
  });

  if (!rows.length) {
    setStatus("No saved projects to export yet.", true);
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const text = String(value ?? "");
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `roadmap-projects-${slugify(getSelectedAccount()?.name)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Project catalog exported.");
}

function getBlendedPageTypeMetrics() {
  const selectedPageTypes = state.pageTypes.filter((pageType) =>
    state.selectedPageTypes.includes(pageType.id),
  );
  if (!selectedPageTypes.length) {
    return getPortfolioBenchmarkMetrics();
  }

  const totalWeight = selectedPageTypes.reduce(
    (sum, pageType) => sum + (pageType.metrics.IMPRESSIONS?.value || pageType.impactWeight || 1),
    0,
  );

  const blended = {};
  for (const pageType of selectedPageTypes) {
    const weight = (pageType.metrics.IMPRESSIONS?.value || pageType.impactWeight || 1) / totalWeight;
    for (const [metricKey, metric] of Object.entries(pageType.metrics)) {
      if (!blended[metricKey]) {
        blended[metricKey] = { ...metric, value: 0 };
      }
      blended[metricKey].value += metric.value * weight;
    }
  }
  return blended;
}

function getPortfolioBenchmarkMetrics() {
  if (!state.pageTypes.length) {
    return {};
  }

  const totalWeight = state.pageTypes.reduce(
    (sum, pageType) => sum + (pageType.metrics.IMPRESSIONS?.value || pageType.impactWeight || 1),
    0,
  );
  const blended = {};
  for (const pageType of state.pageTypes) {
    const weight = (pageType.metrics.IMPRESSIONS?.value || pageType.impactWeight || 1) / totalWeight;
    for (const [metricKey, metric] of Object.entries(pageType.metrics)) {
      if (!blended[metricKey]) {
        blended[metricKey] = { ...metric, value: 0 };
      }
      blended[metricKey].value += metric.value * weight;
    }
  }
  return blended;
}

function getEffectiveCurrentShare() {
  if (typeof state.currentShareOverride === "number" && !Number.isNaN(state.currentShareOverride)) {
    return state.currentShareOverride;
  }
  if (!state.summary) return 0;
  if (state.summary.currentShareAvailable) return state.summary.currentShare;
  const portfolioMetrics = getPortfolioBenchmarkMetrics();
  return portfolioMetrics["Click through rate"]?.value || 0;
}

function getShareStatusMessage() {
  if (!state.summary) return "";
  if (state.summary.currentShareAvailable) {
    return state.summary.shareMessage || "";
  }
  const portfolioMetrics = getPortfolioBenchmarkMetrics();
  const fallbackCtr = portfolioMetrics["Click through rate"]?.value || 0;
  return `${state.summary.shareMessage} Using portfolio CTR benchmark (${formatPercent(
    fallbackCtr,
  )}) as the planning proxy for current share before page type selection.`;
}

function attachEventListeners() {
  elements.apiKeyInput.addEventListener("input", (event) => {
    state.apiKey = event.target.value;
  });

  elements.apiSecretInput.addEventListener("input", (event) => {
    state.apiSecret = event.target.value;
  });

  elements.connectButton.addEventListener("click", async () => {
    await connectToConductor();
  });

  elements.accountSelect.addEventListener("change", async (event) => {
    state.selectedAccountId = event.target.value;
    try {
      await loadWebProperties();
      await loadKeywordGroups();
      await refreshGroupData();
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  elements.webPropertySelect.addEventListener("change", async (event) => {
    state.selectedWebPropertyId = event.target.value;
    await refreshGroupData();
  });

  elements.keywordGroupSelect.addEventListener("change", async (event) => {
    state.selectedGroupId = event.target.value;
    await refreshGroupData();
  });

  elements.monthSelect.addEventListener("change", (event) => {
    state.selectedMonth = Number(event.target.value);
    renderForecast();
  });

  elements.yearSelect.addEventListener("change", (event) => {
    state.selectedYear = Number(event.target.value);
    renderForecast();
  });

  elements.saveOutcomeButton.addEventListener("click", () => {
    if (!state.currentOutcome) {
      setStatus("Build a forecast first, then click Add Current Outcome to save a draggable project card.", true);
      return;
    }

    state.savedOutcomes.unshift({
      id: `outcome-${state.nextOutcomeId++}`,
      ...structuredClone(state.currentOutcome),
    });
    setStatus("Saved a new draggable project card to the tray.");

    renderOutcomeBoard();
  });

  elements.exportOutcomesButton.addEventListener("click", () => {
    exportOutcomeData();
  });
}

async function boot() {
  initializeDateSelects();
  ensureRoadmapAssignments();
  renderAccounts();
  renderWebProperties();
  renderKeywordGroups();
  renderForecast();
  renderConnectionState();
  attachEventListeners();

  try {
    await loadPageTypes();
    let status = { connected: false };
    try {
      status = await fetchJson("/api/connection-status");
    } catch {
      status = { connected: false };
      state.previewMode = true;
      state.hostedPreviewMode = !isLocalHost();
      setStatus(
        state.hostedPreviewMode
          ? "Public benchmark mode is active. Live Conductor connection is available only in the local app."
          : "Running in local preview mode. Connect to Conductor is unavailable until `python3 server.py` is running.",
      );
    }
    state.isConnected = Boolean(status.connected);
    renderConnectionState();
    if (state.isConnected) {
      await loadAccounts();
      await loadWebProperties();
      await loadKeywordGroups();
      await refreshGroupData();
    } else {
      if (!state.pageTypes.length) {
        setStatus("Enter your Conductor credentials to connect.");
      }
    }
  } catch (error) {
    setStatus(error.message, true);
    elements.datasetName.textContent = state.hostedPreviewMode ? "Bundled benchmark data" : "Connection needed";
    elements.datasetSummary.textContent = state.hostedPreviewMode
      ? "The public site uses bundled benchmarks and manual planning inputs."
      : "Open with a local web server to use preview mode, or start `python3 server.py` for live Conductor data.";
  }
}

boot();
