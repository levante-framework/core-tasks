import { pauseButtonSvg, playButtonSvg, exitButtonSvg, fullscreenButtonSvg, menuButtonSvg } from "./components";
import { taskStore } from "../../../taskStore";
import { finalizeCurrentPauseSegment, getActiveTaskElapsedMs } from "./appTimer";
import { InitPageSetup } from "../../../utils/initPageSetup";

let pageSetup: InitPageSetup | null = null;
export function addExperimenterButtons() {
    // don't add if disabled or if they're already there
    if (
        document.querySelector('.experimenter-button-container') != null ||
        !taskStore().experimenterButtons
    ) {
        return;
    }   

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'experimenter-button-container';

    buttonContainer.innerHTML = `
        <button class="utility" id="menu" state="closed">
            ${menuButtonSvg}
        </button>
        <button class="utility transparent" id="exit" style="display: none;">
            ${exitButtonSvg}
        </button>
        <button class="utility transparent" id="pause" style="display: none;">
            ${pauseButtonSvg}
        </button>
    `;

    document.body.appendChild(buttonContainer);

    const pauseButton = document.getElementById("pause");
    pauseButton?.addEventListener('click', () => {
        onPause();
    });

    const exitButton = document.getElementById("exit");
    exitButton?.addEventListener('click', () => {
        onExit();
    });

    const menuButton = document.getElementById("menu");
    menuButton?.addEventListener('click', () => {
        if (menuButton.getAttribute('state') === 'closed') {
            exitButton!.style.display = 'block';
            pauseButton!.style.display = 'block';

            menuButton!.classList.add('open');
            menuButton.setAttribute('state', 'open');
        } else {
            exitButton!.style.display = 'none';
            pauseButton!.style.display = 'none';

            menuButton!.classList.remove('open');
            menuButton.setAttribute('state', 'closed');
        }
    });

    pageSetup = new InitPageSetup(4000, taskStore().translations);
    pageSetup.init();
}

export function setupFullscreenButton() {
    const fullscreenButton = document.getElementById("fullscreen");
    fullscreenButton?.addEventListener('click', () => {
        onFullscreen();
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenButton!.style.visibility = 'hidden';
        } else {
            fullscreenButton!.style.visibility = 'visible';
        }
    });
}

function onPause() {
    if (taskStore().taskTimer != null) {
        clearTimeout(taskStore().taskTimer);
        taskStore('taskTimer', null);
    }
    taskStore('taskTimerPauseBeganAt', Date.now())

    pageSetup?.onPause();
    const playButton = document.getElementById('play-button');
    playButton?.addEventListener('click', () => {
        onResume();
    });
}

function onResume() {
    finalizeCurrentPauseSegment();
    const maxTimeInMilliseconds = Math.max(Number(taskStore().maxTime), 1) * 60000;
    const remainingMs = Math.max(0, maxTimeInMilliseconds - getActiveTaskElapsedMs());
    const timerId = setTimeout(
        () => {
            taskStore('maxTimeReached', true);
            clearTimeout(timerId);
        },
        remainingMs,
    )
    taskStore('taskTimer', timerId)
    // re-enable all buttons
    const buttons = Array.from(document.querySelectorAll('button'));
    buttons.forEach((button: HTMLButtonElement) => {
        button.disabled = false;
    });
}

function onExit() {
    taskStore('quitTask', true);
    document.body.innerHTML = '';
}

function onFullscreen() {
    if (document.fullscreenElement) {
        return;
    }

    document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error enabling fullscreen: ${err.message}`);
    });
}