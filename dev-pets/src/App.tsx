import { withProviders } from "./providers";
import Routing from "./router";

const App = () => {
  return <Routing />;
};

export default withProviders(App);
