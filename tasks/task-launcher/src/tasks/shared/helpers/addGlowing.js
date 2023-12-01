export default function addGlowing(textContent, className) {
    const container = document.querySelector("#jspsych-audio-multi-response-btngroup");
    const buttons = container.querySelectorAll("div.jspsych-audio-multi-response-button");
    // console.log(buttons);
    buttons.forEach((buttonDiv) => {
      const button = buttonDiv.querySelector("button");
      if (button && button.textContent.trim() === textContent) {
        // console.log(button);
        button.classList.add(className);
      }
    });
  }