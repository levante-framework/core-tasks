import { taskStore } from "../../../taskStore";

export async function getAnimationTimestamps(
    isDev: boolean,
    taskName: string, 
    lng: string,
) {
    const project = isDev ? 'dev' : 'prod'

    try {
        const response = await fetch(
          `https://storage.googleapis.com/levante-assets-${project}/translations/itembank/${taskName}/${lng}/animation-audio-timestamps.json`,
        );

        if (response.status === 404) {
            return null; // normal: no file for this task/language
        }

        if (!response.ok) {
            console.warn(`Animation timestamps unavailable (${response.status})`);
            return null; // still run with hardcoded timing
        }

        const animationTimestamps = await response.json();
        taskStore('animationTimestamps', animationTimestamps);
    } catch (error) {
        console.error('Error fetching or parsing animation timestamps:', error);
        return null;
    }
}
