import style from "./style.scss";
import { WeatherWidget } from "./weather";
import { App, Astal,  Gdk } from "astal/gtk3";

function Bar(gdkmonitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

    return <window
        className="Bar"
        gdkmonitor={gdkmonitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        anchor={TOP | LEFT | RIGHT}
        application={App}>
        <WeatherWidget isEnabled={true} />
    </window>
}

App.start({
  css: style,
  main() {
    App.get_monitors().map(Bar);
  },
});
