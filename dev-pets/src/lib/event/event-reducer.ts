import { EventSchema, State } from "../../contexts/event-context";

export type Action = { type: 'REGISTER_EVENT'; event: EventSchema<unknown> } | { type: 'REMOVE_EVENT'; code: string };

export const eventReducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'REGISTER_EVENT': {
            const newEvents = new Map(state.events);
            if (newEvents.has(action.event.code)) {
                throw new ErrorEvent(action.event.code);
            }

            newEvents.set(action.event.code, action.event.callback);

            return {
                ...state,
                events: newEvents,
            };
        }
        case 'REMOVE_EVENT': {

            if (!state.events.has(action.code)) {
                return state;
            }

            state.events.delete(action.code);

            return {
                ...state,
                events: new Map(state.events),
            };
        }
        default:

            return state;
    }
};