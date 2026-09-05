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
  const localDate = value => {
    const parts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!parts) return new Date(NaN);
    const numbers = parts.slice(1).map(part => Number(part || 0));
    const result = new Date(Date.UTC(numbers[0], numbers[1] - 1, numbers[2], numbers[3], numbers[4], numbers[5]));
    const valid = result.getUTCFullYear() === numbers[0] && result.getUTCMonth() === numbers[1] - 1 && result.getUTCDate() === numbers[2] && result.getUTCHours() === numbers[3] && result.getUTCMinutes() === numbers[4] && result.getUTCSeconds() === numbers[5];
    return valid ? result : new Date(NaN);
  };
  // Open-Meteo returns wall-clock timestamps in the requested timezone without an offset.
  // Parse those components directly so a visitor's device timezone cannot shift the display.
  const time = value => `${new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:'UTC'}).format(localDate(value))} Bethel time`;
  const day = value => new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(localDate(value));
  const fmt = value => value == null ? '—' : Math.round(value);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  Object.entries({latitude:config.latitude,longitude:config.longitude,timezone:config.timezone,temperature_unit:'fahrenheit',wind_speed_unit:'mph',precipitation_unit:'inch',forecast_days:7,current:'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,visibility',hourly:'temperature_2m,precipitation_probability,weather_code',daily:'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max'}).forEach(([key,value]) => url.searchParams.set(key,value));

  fetch(url).then(response => { if (!response.ok) throw new Error(`Weather service returned ${response.status}`); return response.json(); }).then(data => {
    if (!isValidWeather(data)) throw new Error('Weather service returned incomplete data');
    render(data);
  }).catch(showUnavailable);

  function hasFields(value, fields) {
    return value && typeof value === 'object' && fields.every(field => Object.prototype.hasOwnProperty.call(value, field));
  }

  function hasAlignedArrays(value, fields) {
    if (!hasFields(value, fields) || !fields.every(field => Array.isArray(value[field]))) return false;
    const length = value[fields[0]].length;
    return length > 0 && fields.every(field => value[field].length === length);
  }

  function isValidWeather(data) {
    const currentFields = ['time','temperature_2m','relative_humidity_2m','apparent_temperature','is_day','precipitation','weather_code','surface_pressure','wind_speed_10m','wind_direction_10m','visibility'];
    const hourlyFields = ['time','temperature_2m','precipitation_probability','weather_code'];
    const dailyFields = ['time','weather_code','temperature_2m_max','temperature_2m_min','sunrise','sunset','precipitation_probability_max'];
    if (!hasFields(data, ['current','hourly','daily']) || !hasFields(data.current, currentFields)) return false;
    if (!hasAlignedArrays(data.hourly, hourlyFields) || !hasAlignedArrays(data.daily, dailyFields)) return false;
    if (Number.isNaN(localDate(data.current.time).getTime()) || ![0, 1].includes(data.current.is_day)) return false;
    const requiredCurrentNumbers = ['temperature_2m','relative_humidity_2m','apparent_temperature','weather_code','wind_speed_10m','wind_direction_10m'];
    const optionalCurrentNumbers = ['precipitation','surface_pressure','visibility'];
    if (!requiredCurrentNumbers.every(field => Number.isFinite(data.current[field]))) return false;
    if (!optionalCurrentNumbers.every(field => data.current[field] == null || Number.isFinite(data.current[field]))) return false;
    if (!data.hourly.time.every(value => !Number.isNaN(localDate(value).getTime())) || !data.daily.time.every(value => !Number.isNaN(localDate(value).getTime()))) return false;
    if (!['temperature_2m','weather_code'].every(field => data.hourly[field].every(Number.isFinite))) return false;
    if (!data.hourly.precipitation_probability.every(value => value == null || Number.isFinite(value))) return false;
    if (!['weather_code','temperature_2m_max','temperature_2m_min'].every(field => data.daily[field].every(Number.isFinite))) return false;
    if (!data.daily.precipitation_probability_max.every(value => value == null || Number.isFinite(value))) return false;
    return data.daily.sunrise.every(value => !Number.isNaN(localDate(value).getTime())) && data.daily.sunset.every(value => !Number.isNaN(localDate(value).getTime()));
  }

  function showUnavailable() {
    if (errorRoot) errorRoot.innerHTML = '<div class="weather-error" role="alert"><strong>Live weather is temporarily unavailable.</strong><br>Please try again later or consult an official weather service.</div>';
    const location = currentRoot.querySelector('p');
    const status = currentRoot.querySelector('h2');
    if (location) location.textContent = config.name;
    if (status) status.textContent = 'Connection unavailable';
    if (hourlyRoot) hourlyRoot.innerHTML = '';
    if (dailyRoot) dailyRoot.innerHTML = '';
  }

  function render(data) {
    const current = data.current;
    const [condition, effect] = describe(current.weather_code);
    if (scene) scene.className = `weather-scene ${effect} ${current.is_day ? 'day' : 'night'}`;
    currentRoot.innerHTML = `<div class="weather-current"><div><p>${config.name} · ${current.is_day ? 'Daytime' : 'Nighttime'}</p><h1 id="weather-title">${fmt(current.temperature_2m)}°</h1><h2>${condition}</h2><p class="weather-updated">Updated ${time(current.time)} · Data from Open-Meteo</p></div><div><strong>Today ${fmt(data.daily.temperature_2m_max[0])}° / ${fmt(data.daily.temperature_2m_min[0])}°</strong></div></div><div class="weather-grid"><div class="weather-stat"><span>Feels like</span><strong>${fmt(current.apparent_temperature)}°F</strong></div><div class="weather-stat"><span>Humidity</span><strong>${fmt(current.relative_humidity_2m)}%</strong></div><div class="weather-stat"><span>Wind</span><strong>${fmt(current.wind_speed_10m)} mph ${compass(current.wind_direction_10m)}</strong></div><div class="weather-stat"><span>Visibility</span><strong>${current.visibility == null ? '—' : (current.visibility / 1609.344).toFixed(1)} mi</strong></div><div class="weather-stat"><span>Pressure</span><strong>${current.surface_pressure == null ? '—' : (current.surface_pressure * .02953).toFixed(2)} inHg</strong></div><div class="weather-stat"><span>Precipitation</span><strong>${current.precipitation ?? '—'} in</strong></div><div class="weather-stat"><span>Sunrise</span><strong>${time(data.daily.sunrise[0])}</strong></div><div class="weather-stat"><span>Sunset</span><strong>${time(data.daily.sunset[0])}</strong></div></div>`;
    const start = Math.max(0, data.hourly.time.findIndex(value => value >= current.time));
    if (hourlyRoot) hourlyRoot.innerHTML = data.hourly.time.slice(start,start+24).map((value,i) => { const n=start+i; const [label]=describe(data.hourly.weather_code[n]); return `<article class="forecast-item"><span>${time(value)}</span><strong>${fmt(data.hourly.temperature_2m[n])}°</strong><small>${label}<br>${data.hourly.precipitation_probability[n] ?? 0}% precip.</small></article>`; }).join('');
    if (dailyRoot) dailyRoot.innerHTML = data.daily.time.map((value,i) => { const [label]=describe(data.daily.weather_code[i]); return `<article class="forecast-item"><span>${i ? day(value) : 'Today'}</span><strong>${fmt(data.daily.temperature_2m_max[i])}° / ${fmt(data.daily.temperature_2m_min[i])}°</strong><small>${label}<br>${data.daily.precipitation_probability_max[i] ?? 0}% precip.</small></article>`; }).join('');
  }
})();
