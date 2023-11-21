/* eslint-disable import/no-cycle */
import jsPsychCallFunction from "@jspsych/plugin-call-function";
import store from "store2";


export const isPractice = () => {
  const currentSubTask = store.session.get("subTaskName");
  if (currentSubTask === "SurveyPractice") {
    return true;
  }
  return false;
};

// reset variables that are calculated per subtask
const subTaskInitStore = (name) => {
  store.session.set("subTaskName", name);
  store.session.set("trialNumSubtask", 0); // counter for trials in subtask
  store.session.set("subtaskCorrect", 0);
  store.session.set("correctItems", []);
  store.session.set("incorrectItems", []);
  return "";
};

export const getCurrentSubTaskSummary = () => {
  const subTaskSummary = {
    subtask: store.session("subTaskName"),
    subtaskCorrect: store.session("subtaskCorrect"),
    totalCorrect: store.session("totalCorrect"),
    correctList: store.session("correctItems"),
    incorrectList: store.session("incorrectItems"),
    trialNumSubtask: store.session("trialNumSubtask"),
    trialNumTotal: store.session("trialNumTotal"),
  };

  return subTaskSummary;
};

// wrap-up after the subtask is done
const subTaskFinish = () => {
  // log subtask results for debugging
  const summary = getCurrentSubTaskSummary();
  //console.log(summary);
};

// trials to initialize each subtask
export const subTaskInit = {
  type: jsPsychCallFunction,
  func: function () {
    subTaskInitStore("Survey");
  },
};

export const subTaskInitPractice = {
  type: jsPsychCallFunction,
  func: function () {
    subTaskInitStore("SurveyPractice");
  },
};

export const subTaskInitMain = {
  type: jsPsychCallFunction,
  func: function () {
    subTaskInitStore("SurveyMain");
  },
};

export const subTaskComplete = {
  type: jsPsychCallFunction,
  func: subTaskFinish,
};
