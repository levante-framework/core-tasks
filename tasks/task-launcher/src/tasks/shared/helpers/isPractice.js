import store from "store2";


export const isPractice = () => {
  const currentSubTask = store.session.get("subTaskName");
  if (currentSubTask === "SurveyPractice") {
    return true;
  }
  return false;
};