import store from "store2";


export const isPractice = (currentSubTask) => {
  if (currentSubTask === "practice") {
    return true;
  }
  return false;
};