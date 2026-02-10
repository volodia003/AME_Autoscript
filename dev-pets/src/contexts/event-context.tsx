import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useReducer,
  useState,
} from "react";
import { register } from "../lib/event/events-actions";
import { Action, eventReducer } from "../lib/event/event-reducer";

export type EventSchema<T = unknown> = {
  code: string;
  callback: (data: T) => void;
};

export interface EventContextType {
  register<T = unknown>(
    dispatch: React.Dispatch<Action>,
    unregister: (code: string) => void,
    event: EventSchema<T>
  ): void;
  unregister(code: string): void;
  emit<T = unknown>(code: string, data?: T): void;
}

export type State = {
  events: Map<string, (data?: unknown) => void>;
};

export const EventContext = createContext<EventContextType | undefined>(
  undefined
);

export const EventProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(eventReducer, {
    events: new Map<string, (data?: unknown) => void>(),
  });

  const unregister = useCallback((code: string) => {
    dispatch({ type: "REMOVE_EVENT", code });
  }, []);

  const emit = useCallback(
    (code: string, data?: unknown) => {
      const event = state.events.get(code);

      if (!event) {
        throw new ErrorEvent(code);
      }

      event(data);
    },
    [state.events]
  );

  const contextValue = useMemo(
    () => ({ register, unregister, emit }),
    [register, unregister, emit]
  );

  return (
    <EventContext.Provider value={contextValue}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => {
  const context = useState(EventContext);

  if (context === undefined) {
    throw new Error(
      {
        hookName: "useEvents",
        providerName: "EventProvider",
      }.toString()
    );
  }

  return context;
};
