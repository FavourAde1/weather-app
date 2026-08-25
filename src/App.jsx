import { useEffect, useState } from 'react'

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

const formatTemp = (value) => `${Math.round(value)}°C`
const formatWind = (value) => `${Math.round(value * 3.6)} km/h`
const formatDay = (timestamp) =>
  timestamp
    ? new Date(timestamp * 1000).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : ''

const getWeatherIconUrl = (code) => (code ? `https://openweathermap.org/img/wn/${code}@2x.png` : '')

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [weather, setWeather] = useState(null)
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)

  const loadWeather = async ({ city, latitude, longitude }) => {
    if (!API_KEY) {
      setError(
        'Add your OpenWeather API key in a .env.local file as VITE_OPENWEATHER_API_KEY before searching.',
      )
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    // Clear previous data to avoid briefly showing stale results
    setWeather(null)
    setForecast([])

    try {
      const query = city
        ? `q=${encodeURIComponent(city)}`
        : `lat=${latitude}&lon=${longitude}`

      const [weatherResponse, forecastResponse] = await Promise.all([
        fetch(`${BASE_URL}/weather?units=metric&appid=${API_KEY}&${query}`),
        fetch(`${BASE_URL}/forecast?units=metric&appid=${API_KEY}&${query}`),
      ])

      if (!weatherResponse.ok) {
        let errMsg = ''
        try {
          const errJson = await weatherResponse.json()
          errMsg = errJson?.message || JSON.stringify(errJson)
        } catch {
          errMsg = await weatherResponse.text()
        }
        throw new Error(errMsg || `Weather API error: ${weatherResponse.status}`)
      }

      if (!forecastResponse.ok) {
        let errMsg = ''
        try {
          const errJson = await forecastResponse.json()
          errMsg = errJson?.message || JSON.stringify(errJson)
        } catch {
          errMsg = await forecastResponse.text()
        }
        throw new Error(errMsg || `Forecast API error: ${forecastResponse.status}`)
      }

      const weatherData = await weatherResponse.json()
      const forecastData = await forecastResponse.json()

      setWeather(weatherData)
      setForecast(
        (forecastData.list || [])
          .filter((entry) => entry.dt_txt && entry.dt_txt.includes('12:00:00'))
          .slice(0, 5)
          .map((entry) => ({
            ...entry,
            day: entry.dt,
            temperature: entry?.main?.temp ?? null,
            description: entry?.weather?.[0]?.description ?? '',
            icon: entry?.weather?.[0]?.icon ?? '',
          })),
      )
      setSearchTerm(weatherData?.name || '')
    } catch (loadError) {
      const msg = loadError && loadError.message ? loadError.message : String(loadError)
      setError(
        (msg && (msg.toLowerCase().includes('city not found') || msg.includes('404')))
          ? 'The city could not be found. Please try another location.'
          : msg,
      )
    } finally {
      setLoading(false)
      setIsAutoDetecting(false)
    }
  }

  const handleSearch = async (event) => {
    event.preventDefault()

    const city = searchTerm.trim()

    if (!city) {
      setError('Please enter a city name to search.')
      return
    }

    await loadWeather({ city })
  }

  const handleLocationSearch = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser. Please search for a city instead.')
      return
    }

    setIsAutoDetecting(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        // loadWeather handles its own errors; attach a catch to avoid unhandled rejections
        loadWeather({ latitude, longitude }).catch((e) => console.error(e))
      },
      (err) => {
        setIsAutoDetecting(false)
        setError(err?.message || 'Unable to determine your location. Please search manually for a city.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  useEffect(() => {
    if (navigator.geolocation) {
      handleLocationSearch()
      return
    }

    loadWeather({ city: 'London' })
  }, [])

  const currentWeather = weather
    ? {
        city: weather?.name ?? '',
        country: weather?.sys?.country ?? '',
        temp: formatTemp(weather?.main?.temp ?? 0),
        feelsLike: formatTemp(weather?.main?.feels_like ?? 0),
        description: weather?.weather?.[0]?.description ?? '',
        humidity: `${weather?.main?.humidity ?? 0}%`,
        wind: formatWind(weather?.wind?.speed ?? 0),
        icon: getWeatherIconUrl(weather?.weather?.[0]?.icon),
        date: new Date((weather?.dt ?? 0) * 1000).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
        sunrise: new Date((weather?.sys?.sunrise ?? 0) * 1000).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
        sunset: new Date((weather?.sys?.sunset ?? 0) * 1000).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        }),
      }
    : null

  return (
    <div
      className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50 sm:px-6 lg:px-8"
      style={{
        backgroundImage:
          "linear-gradient(rgba(2, 6, 23, 0.72), rgba(2, 6, 23, 0.78)), url('/mechatronics-hub-ng-logo.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-sky-950/30 backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <img src="/mechatronics-hub-ng-logo.png" alt="Mechatronics Hub NG" className="h-12 w-12 rounded-md bg-white/5 p-1" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-200/80">
                    Mechatronics Hub NG
                  </p>
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-sky-100/70">Weather Dashboard</p>
                </div>
              </div>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Forecast at a glance</h1>
            </div>

            <button
              type="button"
              onClick={handleLocationSearch}
              disabled={isAutoDetecting}
              aria-busy={isAutoDetecting}
              className="inline-flex items-center justify-center rounded-full border border-sky-300/40 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-200 hover:bg-sky-400/20"
            >
              {isAutoDetecting ? 'Detecting location…' : 'Use my location'}
            </button>
          </div>

          <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="city-search">
              Search city
            </label>
            <input
              id="city-search"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for a city"
              className="w-full rounded-full border border-white/10 bg-slate-900/70 px-5 py-3 text-base text-white placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            <button
              type="submit"
              className="rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-600/30 transition hover:brightness-110"
            >
              Search
            </button>
          </form>
        </header>

        {error ? (
          <div
            role="alert"
            aria-live="polite"
            className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-8 flex min-h-[240px] items-center justify-center rounded-[2rem] border border-white/10 bg-slate-900/50">
            <div className="flex items-center gap-3 text-sky-200">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-sky-200/40 border-t-sky-300" />
              Loading weather…
            </div>
          </div>
        ) : null}

        {currentWeather && !loading ? (
          <>
            <main className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
              <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-sky-500/20 via-sky-600/10 to-indigo-500/20 p-5 shadow-xl shadow-sky-950/20 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-sky-100/70">Now</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                      {currentWeather.city}, {currentWeather.country}
                    </h2>
                    <p className="mt-1 text-sm text-sky-100/80">{currentWeather.date}</p>
                  </div>

                  <img src={currentWeather.icon} alt={currentWeather.description} className="h-20 w-20" />
                </div>

                <div className="mt-6 flex flex-wrap items-end gap-5">
                  <div className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
                    {currentWeather.temp}
                  </div>
                  <div className="pb-2 text-sm text-sky-100/80">
                    Feels like {currentWeather.feelsLike}
                  </div>
                </div>

                <p className="mt-3 text-lg capitalize text-sky-50">{currentWeather.description}</p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-100/70">Humidity</p>
                    <p className="mt-2 text-xl font-semibold text-white">{currentWeather.humidity}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-100/70">Wind</p>
                    <p className="mt-2 text-xl font-semibold text-white">{currentWeather.wind}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-100/70">Condition</p>
                    <p className="mt-2 text-xl font-semibold capitalize text-white">
                      {currentWeather.description}
                    </p>
                  </div>
                </div>
              </section>

              <aside className="rounded-[2rem] border border-white/10 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/20 sm:p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-sky-200/80">Details</p>
                <div className="mt-5 space-y-4 text-sm text-slate-200">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span>Sunrise</span>
                    <span className="font-medium text-white">{currentWeather.sunrise}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span>Sunset</span>
                    <span className="font-medium text-white">{currentWeather.sunset}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span>Humidity</span>
                    <span className="font-medium text-white">{currentWeather.humidity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Wind</span>
                    <span className="font-medium text-white">{currentWeather.wind}</span>
                  </div>
                </div>
              </aside>
            </main>

            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold text-white">5-day forecast</h3>
                <span className="text-sm text-sky-200/80">Next 5 days</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {forecast.map((day, idx) => (
                  <article
                    key={`${day.dt ?? ''}-${idx}`}
                    className="rounded-[1.75rem] border border-white/10 bg-slate-900/60 p-4 text-center shadow-lg shadow-slate-950/20"
                  >
                    <p className="text-sm font-medium text-sky-200/80">{formatDay(day.day)}</p>
                    <img
                      src={getWeatherIconUrl(day.icon)}
                      alt={day.description}
                      className="mx-auto mt-3 h-16 w-16"
                    />
                    <p className="mt-2 text-lg font-semibold text-white">{formatTemp(day.temperature)}</p>
                    <p className="mt-1 capitalize text-sm text-slate-300">{day.description}</p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default App
