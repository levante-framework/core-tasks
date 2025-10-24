import { taskStore } from "../../../taskStore";

const responsesId = "childSurveyRespoonses";

export function getChildSurveyResponses() {
    const t = taskStore().translations;

    return t[responsesId].split(';');
}
