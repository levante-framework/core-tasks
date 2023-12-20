import jsPsychCallFunction from "@jspsych/plugin-call-function";
import store from "store2";


export const isPractice = () => {
  const currentSubTask = store.session.get("subTaskName");
  if (currentSubTask === "practice") {
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
};


// trials to initialize each subtask
export const subTaskInitPractice = {
  type: jsPsychCallFunction,
  func: function () {
    subTaskInitStore("practice");
  },
};

export const subTaskInitStimulus = {
  type: jsPsychCallFunction,
  func: function () {
    subTaskInitStore("stimulus");
  },
};
