import { EventProvider } from "../contexts/event-context";

export const withEvents = (component: () => React.ReactNode) => () => {
  return <EventProvider>{component()}</EventProvider>;
};
