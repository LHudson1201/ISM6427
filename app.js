// Default location: Boca Raton, FL
const DEFAULT_LOCATION = {
  name: "Boca Raton",
  region: "Florida",
  latitude: 26.3587,
  longitude: -80.0831,
};

// WMO weather codes -> label, day icon, night icon, background theme
const WEATHER = {
  0: ["Clear", "☀️", "🌙", "clear"],
  1: ["Mostly Clear", "🌤️", "🌙", "clear"],
  2: ["Partly Cloudy", "⛅", "☁️", "cloudy"],
  3: ["Cloudy", "☁️", "☁️", "cloudy"],
  45: ["Fog", "🌫️", "🌫️", "fog"],
  48: ["Freezing Fog", "🌫️", "🌫️", "fog"],
  51: ["Light Drizzle", "🌦️", "🌧️", "rain"],
  53: ["Drizzle", "🌦️", "🌧️", "rain"],
  55: ["Heavy Drizzle", "🌧️", "🌧️", "rain"],
  56: ["Freezing Drizzle", "🌧️", "🌧️", "rain"],
  57: ["Freezing Drizzle", "🌧️", "🌧️", "rain"],
  61: ["Light Rain", "🌦️", "🌧️", "rain"],
  63: ["Rain", "🌧️", "🌧️", "rain"],
  65: ["Heavy Rain", "🌧️", "🌧️", "rain"],
  66: ["Freezing Rain", "🌧️", "🌧️", "rain"],
  67: ["Freezing Rain", "🌧️", "🌧️", "rain"],
  71: ["Light Snow", "🌨️", "🌨️", "snow"],
  73: ["Snow", "🌨️", "🌨️", "snow"],
  75: ["Heavy Snow", "❄️", "❄️", "snow"],
  77: ["Snow Grains", "🌨️", "🌨️", "snow"],
  80: ["Rain Showers", "🌦️", "🌧️", "rain"],
  81: ["Rain Showers", "🌧️", "🌧️", "rain"],
  82: ["Heavy Showers", "⛈️", "⛈️", "storm"],
  85: ["Snow Showers", "🌨️", "🌨️", "snow"],
  86: ["Snow Showers", "❄️", "❄️", "snow"],
  95: ["Thunderstorm", "⛈️", "⛈️", "storm"],
  96: ["Thunderstorm", "⛈️", "⛈️", "storm"],
  99: ["Thunderstorm", "⛈️", "⛈️", "storm"],
};

const USER_NAME = "Lacey";

const $ = (id) => document.getElementById(id);

// ---- Theme: light, dark, or follow the system ----
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function getThemePref() {
  try { return localStorage.getItem("theme") || "system"; } catch { return "system"; }
}

function applyTheme(pref) {
  const dark = pref === "dark" || (pref === "system" && systemDark.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.themeChoice === pref));
  });
}

document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const pref = btn.dataset.themeChoice;
    try { localStorage.setItem("theme", pref); } catch {}
    applyTheme(pref);
  });
});

// When set to System, follow OS changes live
systemDark.addEventListener("change", () => {
  if (getThemePref() === "system") applyTheme("system");
});

applyTheme(getThemePref());

// Greeting based on the local time at the selected location
function greetingFor(isoTime) {
  const h = parseInt(isoTime.slice(11, 13), 10);
  const part = h < 5 ? "evening" : h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  return `Good ${part}, ${USER_NAME}`;
}

function describe(code, isDay = 1) {
  const [label, dayIcon, nightIcon, theme] = WEATHER[code] || ["Unknown", "🌡️", "🌡️", "cloudy"];
  return { label, icon: isDay ? dayIcon : nightIcon, theme };
}

// Open-Meteo returns local times like "2026-11-10T14:00" (timezone=auto)
function formatHour(iso) {
  const h = parseInt(iso.slice(11, 13), 10);
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12} ${suffix}`;
}

function formatTime(iso) {
  const h = parseInt(iso.slice(11, 13), 10);
  const m = iso.slice(14, 16);
  return `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

function formatDay(dateStr, index) {
  if (index === 0) return "Today";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
}

const round = (n) => Math.round(n);

async function loadWeather(place) {
  $("error").hidden = true;
  $("city").textContent = place.name;
  $("condition").textContent = "Loading…";

  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: 7,
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data = await res.json();
    render(data);
  } catch (err) {
    $("condition").textContent = "";
    $("error").textContent = `Couldn't load weather: ${err.message}`;
    $("error").hidden = false;
  }
}

function render({ current, hourly, daily }) {
  const now = describe(current.weather_code, current.is_day);

  // Background theme
  const theme = now.theme === "clear" ? (current.is_day ? "clear-day" : "clear-night") : now.theme;
  document.body.className = theme;

  // Greeting + current
  $("greeting").textContent = greetingFor(current.time);
  $("temp").textContent = `${round(current.temperature_2m)}°`;
  $("condition").textContent = now.label;
  $("hilo").textContent = `H:${round(daily.temperature_2m_max[0])}°  L:${round(daily.temperature_2m_min[0])}°`;

  // Hourly: next 24 hours starting from the current hour
  const start = Math.max(0, hourly.time.findIndex((t) => t.slice(0, 13) === current.time.slice(0, 13)));
  $("hourly").innerHTML = hourly.time
    .slice(start, start + 24)
    .map((t, i) => {
      const idx = start + i;
      const w = describe(hourly.weather_code[idx], hourly.is_day[idx]);
      const pop = hourly.precipitation_probability[idx];
      return `
        <div class="hour">
          <span>${i === 0 ? "Now" : formatHour(t)}</span>
          <span class="icon">${w.icon}</span>
          <span class="pop">${pop >= 20 ? pop + "%" : ""}</span>
          <span>${round(hourly.temperature_2m[idx])}°</span>
        </div>`;
    })
    .join("");

  // Daily with Apple-style temperature range bars
  const weekMin = Math.min(...daily.temperature_2m_min);
  const weekMax = Math.max(...daily.temperature_2m_max);
  const span = weekMax - weekMin || 1;
  $("daily").innerHTML = daily.time
    .map((d, i) => {
      const lo = daily.temperature_2m_min[i];
      const hi = daily.temperature_2m_max[i];
      const left = ((lo - weekMin) / span) * 100;
      const width = ((hi - lo) / span) * 100;
      return `
        <div class="day">
          <span>${formatDay(d, i)}</span>
          <span class="icon">${describe(daily.weather_code[i]).icon}</span>
          <div class="range">
            <span class="lo">${round(lo)}°</span>
            <div class="bar"><span style="left:${left}%;width:${width}%"></span></div>
            <span class="hi">${round(hi)}°</span>
          </div>
        </div>`;
    })
    .join("");

  // Detail tiles
  const tiles = [
    ["Feels Like", `${round(current.apparent_temperature)}°`, feelsLikeNote(current)],
    ["Humidity", `${current.relative_humidity_2m}%`, ""],
    ["Wind", `${round(current.wind_speed_10m)} mph`, compass(current.wind_direction_10m)],
    ["UV Index", round(daily.uv_index_max[0]), uvLabel(daily.uv_index_max[0])],
    ["Sunrise", formatTime(daily.sunrise[0]), `Sunset: ${formatTime(daily.sunset[0])}`],
    ["Precipitation", `${daily.precipitation_probability_max[0] ?? 0}%`, "Chance today"],
  ];
  $("details").innerHTML = tiles
    .map(([title, value, note]) => `
      <div class="glass tile">
        <h3>${title}</h3>
        <div class="value">${value}</div>
        <p>${note}</p>
      </div>`)
    .join("");
}

function feelsLikeNote(c) {
  const diff = c.apparent_temperature - c.temperature_2m;
  if (Math.abs(diff) < 2) return "Similar to the actual temperature.";
  return diff > 0 ? "Humidity makes it feel warmer." : "Wind makes it feel cooler.";
}

function uvLabel(uv) {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very High";
  return "Extreme";
}

function compass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return `From the ${dirs[Math.round(deg / 45) % 8]}`;
}

// City search via Open-Meteo Geocoding API
$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("query").value.trim();
  if (!q) return;

  const list = $("results");
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`
    );
    const data = await res.json();
    const places = data.results || [];

    if (!places.length) {
      list.innerHTML = `<li>No results for "${q.replace(/</g, "&lt;")}"</li>`;
    } else {
      list.innerHTML = places
        .map((p, i) => `<li data-i="${i}">${p.name}<br><small>${[p.admin1, p.country].filter(Boolean).join(", ")}</small></li>`)
        .join("");
      list.querySelectorAll("li[data-i]").forEach((li) => {
        li.addEventListener("click", () => {
          const p = places[li.dataset.i];
          list.hidden = true;
          $("query").value = "";
          loadWeather({ name: p.name, latitude: p.latitude, longitude: p.longitude });
        });
      });
    }
    list.hidden = false;
  } catch {
    list.innerHTML = "<li>Search failed. Try again.</li>";
    list.hidden = false;
  }
});

// Hide results when clicking elsewhere
document.addEventListener("click", (e) => {
  if (!$("search").contains(e.target)) $("results").hidden = true;
});

loadWeather(DEFAULT_LOCATION);
