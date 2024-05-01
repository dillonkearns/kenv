import { fetchWeatherApi } from "openmeteo";

const params = {
  latitude: 34.44641478747727,
  longitude: -119.74492555491167,
  hourly: [
    "temperature_2m",
    "apparent_temperature",
    "precipitation_probability",
  ],
  daily: ["sunrise", "sunset", "uv_index_max"],
  temperature_unit: "fahrenheit",
  wind_speed_unit: "mph",
  precipitation_unit: "inch",
  timezone: "America/Los_Angeles",
  past_days: 1,
  forecast_days: 1,
};
const url = "https://api.open-meteo.com/v1/forecast";
const responses = await fetchWeatherApi(url, params);

// Helper function to form time ranges
const range = (start: number, stop: number, step: number) =>
  Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

// Process first location. Add a for-loop for multiple locations or weather models
const response = responses[0];

// Attributes for timezone and location
const utcOffsetSeconds = response.utcOffsetSeconds();
const timezone = response.timezone();
const timezoneAbbreviation = response.timezoneAbbreviation();
const latitude = response.latitude();
const longitude = response.longitude();

const hourly = response.hourly()!;
const daily = response.daily()!;

// Note: The order of weather variables in the URL query and the indices below need to match!
const weatherData = {
  hourly: {
    time: range(
      Number(hourly.time()),
      Number(hourly.timeEnd()),
      hourly.interval(),
    ).map((t) => new Date((t + utcOffsetSeconds) * 1000)),
    temperature2m: hourly.variables(0)!.valuesArray()!,
    apparentTemperature: hourly.variables(1)!.valuesArray()!,
    precipitationProbability: hourly.variables(2)!.valuesArray()!,
  },
  daily: {
    time: range(
      Number(daily.time()),
      Number(daily.timeEnd()),
      daily.interval(),
    ).map((t) => new Date((t + utcOffsetSeconds) * 1000)),
    sunrise: daily.variables(0)!.valuesArray()!,
    sunset: daily.variables(1)!.valuesArray()!,
    uvIndexMax: daily.variables(2)!.valuesArray()!,
  },
};
debugger;

// // `weatherData` now contains a simple structure with arrays for datetime and weather data
// for (let i = 0; i < weatherData.hourly.time.length; i++) {
//   console.log(
//     weatherData.hourly.time[i].toISOString(),
//     weatherData.hourly.temperature2m[i],
//     weatherData.hourly.apparentTemperature[i],
//     weatherData.hourly.precipitationProbability[i],
//   );
// }
// for (let i = 0; i < weatherData.daily.time.length; i++) {
//   console.log(
//     weatherData.daily.time[i].toISOString(),
//     weatherData.daily.sunrise[i],
//     weatherData.daily.sunset[i],
//     weatherData.daily.uvIndexMax[i],
//   );
// }
