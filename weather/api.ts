import { UnitType, Weather, WeatherIconTitle, WeatherIcon } from './types.ts';
import { DEFAULT_WEATHER } from './default-weather.ts';
import GLib from 'gi://GLib?version=2.0';
import { weatherIcons } from './weather-icons.ts';
import { AstalIO, bind, execAsync, interval, Variable } from 'astal';
const weatherApiKey = Variable(/*fetchedApiKey*/"");


const { EXISTS, IS_REGULAR } = GLib.FileTest;

const { key, interval: weatherInterval, location } = { key: "", location: "Freiburg", interval: () => { } };

export const globalWeatherVar = Variable<Weather>(DEFAULT_WEATHER);

let weatherIntervalInstance: null | AstalIO.Time = null;

/**
 * Sets up a weather update interval function.
 *
 * @param weatherInterval - The interval in milliseconds at which to fetch weather updates.
 * @param loc - The location for which to fetch weather data.
 * @param weatherKey - The API key for accessing the weather service.
 */
const weatherIntervalFn = (weatherInterval: number, loc: string, weatherKey: string): void => {
  if (weatherIntervalInstance !== null) {
    weatherIntervalInstance.cancel();
  }

  const formattedLocation = loc.replaceAll(' ', '%20');

  weatherIntervalInstance = interval(weatherInterval, () => {
    execAsync(
      `curl "https://api.weatherapi.com/v1/forecast.json?key=${weatherKey}&q=${formattedLocation}&days=1&aqi=no&alerts=no"`,
    )
      .then((res) => {
        try {
          if (typeof res !== 'string') {
            return globalWeatherVar.set(DEFAULT_WEATHER);
          }

          const parsedWeather = JSON.parse(res);

          if (Object.keys(parsedWeather).includes('error')) {
            return globalWeatherVar.set(DEFAULT_WEATHER);
          }

          return globalWeatherVar.set(parsedWeather);
        } catch (error) {
          globalWeatherVar.set(DEFAULT_WEATHER);
          console.warn(`Failed to parse weather data: ${error}`);
        }
      })
      .catch((err) => {
        console.error(`Failed to fetch weather: ${err}`);
        globalWeatherVar.set(DEFAULT_WEATHER);
      });
  });
};


Variable.derive([bind(weatherApiKey), bind(weatherInterval), bind(location)], (weatherKey, weatherInterval, loc) => {
  if (!weatherKey) {
    return globalWeatherVar.set(DEFAULT_WEATHER);
  }
  weatherIntervalFn(weatherInterval, loc, weatherKey);
})();

/**
 * Gets the temperature from the weather data in the specified unit.
 *
 * @param weatherData - The weather data object.
 * @param unitType - The unit type, either 'imperial' or 'metric'.
 * @returns - The temperature formatted as a string with the appropriate unit.
 */
export const getTemperature = (weatherData: Weather): string => {
  return `${Math.ceil(weatherData.current.temp_c)}° C`;
};

/**
 * Returns the appropriate weather icon and color class based on the temperature in Fahrenheit.
 *
 * @param fahrenheit - The temperature in Fahrenheit.
 * @returns - An object containing the weather icon and color class.
 */
export const getWeatherIcon = (fahrenheit: number): Record<string, string> => {
  const icons = {
    100: '',
    75: '',
    50: '',
    25: '',
    0: '',
  } as const;
  const colors = {
    100: 'weather-color red',
    75: 'weather-color orange',
    50: 'weather-color lavender',
    25: 'weather-color blue',
    0: 'weather-color sky',
  } as const;

  type IconKeys = keyof typeof icons;

  const threshold: IconKeys =
    fahrenheit < 0 ? 0 : ([100, 75, 50, 25, 0] as IconKeys[]).find((threshold) => threshold <= fahrenheit) || 0;

  const icon = icons[threshold || 50];
  const color = colors[threshold || 50];

  return {
    icon,
    color,
  };
};

/**
 * Gets the wind conditions from the weather data in the specified unit.
 *
 * @param weatherData - The weather data object.
 * @param unitType - The unit type, either 'imperial' or 'metric'.
 * @returns - The wind conditions formatted as a string with the appropriate unit.
 */
export const getWindConditions = (weatherData: Weather, unitType: UnitType): string => {
  if (unitType === 'imperial') {
    return `${Math.floor(weatherData.current.wind_mph)} mph`;
  }
  return `${Math.floor(weatherData.current.wind_kph)} kph`;
};

/**
 * Gets the chance of rain from the weather forecast data.
 *
 * @param weatherData - The weather data object.
 * @returns - The chance of rain formatted as a percentage string.
 */
export const getRainChance = (weatherData: Weather): string =>
  `${weatherData.forecast.forecastday[0].day.daily_chance_of_rain}%`;

/**
 * Type Guard
 * Checks if the given title is a valid weather icon title.
 *
 * @param title - The weather icon title to check.
 * @returns - True if the title is a valid weather icon title, false otherwise.
 */
export const isValidWeatherIconTitle = (title: string): title is WeatherIconTitle => {
  return title in weatherIcons;
};

/**
 * Gets the appropriate weather icon based on the weather status text.
 *
 * @param weatherData - The weather data object.
 * @returns - The weather icon corresponding to the weather status text.
 */
export const getWeatherStatusTextIcon = (weatherData: Weather): WeatherIcon => {
  let iconQuery = weatherData.current.condition.text.trim().toLowerCase().replaceAll(' ', '_');

  if (!weatherData.current.is_day && iconQuery === 'partly_cloudy') {
    iconQuery = 'partly_cloudy_night';
  }

  if (isValidWeatherIconTitle(iconQuery)) {
    return weatherIcons[iconQuery];
  } else {
    console.warn(`Unknown weather icon title: ${iconQuery}`);
    return weatherIcons['warning'];
  }
};

export const convertCelsiusToFahrenheit = (celsiusValue: number): number => {
  return (celsiusValue * 9) / 5 + 32;
};

globalThis['globalWeatherVar'] = globalWeatherVar;
