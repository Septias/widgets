import { globalWeatherVar } from '../../api.ts';
import { getNextEpoch } from '../helpers';
import { bind, Variable } from 'astal';


export const HourlyTemp = ({ hoursFromNow }: HourlyTempProps): JSX.Element => {
    const weatherBinding = Variable.derive([bind(globalWeatherVar)], (weather) => {
        if (!Object.keys(weather).length) {
            return '-';
        }

        const nextEpoch = getNextEpoch(weather, hoursFromNow);
        const weatherAtEpoch = weather.forecast.forecastday[0].hour.find((h) => h.time_epoch === nextEpoch);
        return `${weatherAtEpoch ? Math.ceil(weatherAtEpoch.temp_c) : '-'}° C`;
    });

    return (
        <label
            className={'hourly-weather-temp'}
            label={weatherBinding()}
            onDestroy={() => {
                weatherBinding.drop();
            }}
        />
    );
};

interface HourlyTempProps {
    hoursFromNow: number;
}
