import { pauseButtonSvg, playButtonSvg, exitButtonSvg, fullscreenButtonSvg, menuButtonSvg } from "./components";
import { taskStore } from "../../../taskStore";
import { finalizeCurrentPauseSegment, getActiveTaskElapsedMs } from "./appTimer";

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
        <button class="utility transparent" id="pause-play" state="pause" style="display: none;">
            ${pauseButtonSvg}
        </button>
    `;

    document.body.appendChild(buttonContainer);

    const pausePlayButton = document.getElementById("pause-play");
    pausePlayButton?.addEventListener('click', () => {
        if (pausePlayButton.getAttribute('state') === 'pause') {
            pausePlayButton.innerHTML = playButtonSvg;
            pausePlayButton.setAttribute('state', 'play');

            if (taskStore().taskTimer != null) {
                clearTimeout(taskStore().taskTimer);
                taskStore('taskTimer', null);
            }
            taskStore('taskTimerPauseBeganAt', Date.now());

            // disable all buttons except the experimenter buttons
            let buttons = Array.from(document.querySelectorAll('button'));
            const experimenterBtnIds = ['menu', 'exit', 'pause-play'];
            buttons = buttons.filter((button: HTMLButtonElement) => !experimenterBtnIds.includes(button.id));
            buttons.forEach((button: HTMLButtonElement) => {
                button.disabled = true;
            });
        } else {
            pausePlayButton.innerHTML = pauseButtonSvg;
            pausePlayButton.setAttribute('state', 'pause');

            finalizeCurrentPauseSegment();
            const maxTimeInMilliseconds = Math.max(Number(taskStore().maxTime), 1) * 60000;
            const remainingMs = Math.max(0, maxTimeInMilliseconds - getActiveTaskElapsedMs());
            const timerId = setTimeout(
                () => {
                    taskStore('maxTimeReached', true);
                    clearTimeout(timerId);
                },
                remainingMs,
            );

            taskStore('taskTimer', timerId);

            // re-enable all buttons
            const buttons = Array.from(document.querySelectorAll('button'));
            buttons.forEach((button: HTMLButtonElement) => {
                button.disabled = false;
            });
        }
    });

    const exitButton = document.getElementById("exit");
    exitButton?.addEventListener('click', () => {
        taskStore('quitTask', true);
        document.body.innerHTML = '';
    });

    const menuButton = document.getElementById("menu");
    menuButton?.addEventListener('click', () => {
        if (menuButton.getAttribute('state') === 'closed') {
            exitButton!.style.display = 'block';
            pausePlayButton!.style.display = 'block';

            menuButton!.classList.add('open');
            menuButton.setAttribute('state', 'open');
        } else {
            exitButton!.style.display = 'none';
            pausePlayButton!.style.display = 'none';

            menuButton!.classList.remove('open');
            menuButton.setAttribute('state', 'closed');
        }
    });
}

export function setupFullscreenButton() {
    const fullscreenButton = document.getElementById("fullscreen");
    fullscreenButton?.addEventListener('click', () => {
        if (document.fullscreenElement) {
            return;
        }

        document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error enabling fullscreen: ${err.message}`);
        });
    });

    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenButton!.style.visibility = 'hidden';
        } else {
            fullscreenButton!.style.visibility = 'visible';
        }
    });
}