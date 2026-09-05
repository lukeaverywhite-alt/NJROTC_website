(() => {
  const config = window.SITE_CONFIG.weather;
  const currentRoot = document.querySelector('[data-weather-current]');
  if (!currentRoot) return;
  const scene = document.querySelector('[data-weather-scene]');
  const errorRoot = document.querySelector('[data-weather-error]');
  const hourlyRoot = document.querySelector('[data-hourly]');
  const dailyRoot = document.querySelector('[data-daily]');
  const codes = {
    0:['Clear','clear'],1:['Mostly clear','clear'],2:['Partly cloudy','cloudy'],3:['Overcast','cloudy'],
    45:['Fog','fog'],48:['Freezing fog','fog'],51:['Light drizzle','rain'],53:['Drizzle','rain'],55:['Heavy drizzle','rain'],
    56:['Freezing drizzle','rain'],57:['Heavy freezing drizzle','rain'],61:['Light rain','rain'],63:['Rain','rain'],65:['Heavy rain','rain'],
    66:['Freezing rain','rain'],67:['Heavy freezing rain','rain'],71:['Light snow','snow'],73:['Snow','snow'],75:['Heavy snow','snow'],
    77:['Snow grains','snow'],80:['Rain showers','rain'],81:['Rain showers','rain'],82:['Heavy rain showers','storm'],
    85:['Snow showers','snow'],86:['Heavy snow showers','snow'],95:['Thunderstorm','storm'],96:['Thunderstorm with hail','storm'],99:['Severe thunderstorm with hail','storm']
  };
  const describe = code => codes[code] || ['Conditions unavailable','cloudy'];
  const compass = degrees => ['N','NE','E','SE','S','SW','W','NW'][Math.round(degrees / 45) % 8];
  const time = value => new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date(value));
  const day = value => new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(new Date(`${value}T12:00:00`));
  const fmt = value => value == null ? '—' : Math.round(value);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  Object.entries({latitude:config.latitude,longitude:config.longitude,timezone:config.timezone,temperature_unit:'fahrenheit',wind_speed_unit:'mph',precipitation_unit:'inch',forecast_days:7,current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility',hourly:'temperature_2m,precipitation_probability,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max'}).forEach(([key,value]) => url.searchParams.set(key,value));

  fetch(url).then(response => { if (!response.ok) throw new Error(`Weather service returned ${response.status}`); return response.json(); }).then(render).catch(() => {
    errorRoot.innerHTML = '<div class="weather-error" role="alert"><strong>Live weather is temporarily unavailable.</strong><br>Please try again later or consult an official weather service.</div>';
    currentRoot.querySelector('p').textContent = config.name;
    currentRoot.querySelector('h2').textContent = 'Connection unavailable';
  });

  function render(data) {
    const current = data.current;
    const [condition, effect] = describe(current.weather_code);
    scene.className = `weather-scene ${effect} ${current.is_day ? 'day' : 'night'}`;
    scene.className = `weather-scene ${effect}`;
    currentRoot.innerHTML = `<div class="weather-current"><div><p>${config.name} · ${current.is_day ? 'Daytime' : 'Nighttime'}</p><h1 id="weather-title">${fmt(current.temperature_2m)}°</h1><h2>${condition}</h2><p class="weather-updated">Updated ${time(current.time)} · Data from Open-Meteo</p></div><div><strong>Today ${fmt(data.daily.temperature_2m_max[0])}° / ${fmt(data.daily.temperature_2m_min[0])}°</strong></div></div><div class="weather-grid"><div class="weather-stat"><span>Feels like</span><strong>${fmt(current.apparent_temperature)}°F</strong></div><div class="weather-stat"><span>Humidity</span><strong>${fmt(current.relative_humidity_2m)}%</strong></div><div class="weather-stat"><span>Wind</span><strong>${fmt(current.wind_speed_10m)} mph ${compass(current.wind_direction_10m)}</strong></div><div class="weather-stat"><span>Visibility</span><strong>${current.visibility == null ? '—' : (current.visibility / 1609.344).toFixed(1)} mi</strong></div><div class="weather-stat"><span>Pressure</span><strong>${current.surface_pressure == null ? '—' : (current.surface_pressure * .02953).toFixed(2)} inHg</strong></div><div class="weather-stat"><span>Precipitation</span><strong>${current.precipitation ?? '—'} in</strong></div><div class="weather-stat"><span>Sunrise</span><strong>${time(data.daily.sunrise[0])}</strong></div><div class="weather-stat"><span>Sunset</span><strong>${time(data.daily.sunset[0])}</strong></div></div>`;
    const start = Math.max(0, data.hourly.time.findIndex(value => value >= current.time));
    hourlyRoot.innerHTML = data.hourly.time.slice(start,start+24).map((value,i) => { const n=start+i; const [label]=describe(data.hourly.weather_code[n]); return `<article class="forecast-item"><span>${time(value)}</span><strong>${fmt(data.hourly.temperature_2m[n])}°</strong><small>${label}<br>${data.hourly.precipitation_probability[n] ?? 0}% precip.</small></article>`; }).join('');
    dailyRoot.innerHTML = data.daily.time.map((value,i) => { const [label]=describe(data.daily.weather_code[i]); return `<article class="forecast-item"><span>${i ? day(value) : 'Today'}</span><strong>${fmt(data.daily.temperature_2m_max[i])}° / ${fmt(data.daily.temperature_2m_min[i])}°</strong><small>${label}<br>${data.daily.precipitation_probability_max[i] ?? 0}% precip.</small></article>`; }).join('');
  }
})();
