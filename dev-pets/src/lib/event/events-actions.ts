import { useCallback } from "react";
import { EventSchema } from "../../contexts/event-context";
import { Action } from "./event-reducer";

export function register<T = unknown,>(dispatch: React.Dispatch<Action>, unregister: (code: string) => void, event: EventSchema<T>) {
    useCallback(
        () => {
            dispatch({
                type: "REGISTER_EVENT",
                event: {
                    code: event.code,
                    callback: event.callback as (data?: unknown) => void,
                },
            });

            return () => unregister(event.code);
        },
        [unregister]
    )
}