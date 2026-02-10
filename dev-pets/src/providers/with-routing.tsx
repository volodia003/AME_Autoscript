import { BrowserRouter } from "react-router";

export const withRouting = (component: () => React.ReactNode) => () => {
  return <BrowserRouter>{component()}</BrowserRouter>;
};
