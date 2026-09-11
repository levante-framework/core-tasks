import { RoarAppkit, LocationV1 } from "@levante-framework/firekit";
import { taskStore } from "../../../taskStore";

let firekit: RoarAppkit;

export function initLocationPersistence(config: Record<string, any>) {
    firekit = config.firekit;
}

export function persistLocation(location: LocationV1) {
    if (!taskStore().demoMode && location && firekit) {
        firekit.updateUser({ location });
    }
}
