# Description

The tasks are all housed in this single repo using a monorepo like-structure. Which task is run is selected at run time based on the passed in parameters (e.g. `?task=egma-math`). This can be run standalone as a web app or as an npm package (in ROAD for example). The 'Task Launcher' is simply the name of the class that runs the whole app code.

## App code flow

_As a Standalone web app_

serve.js -> index.js -> taskConfig.js -> load assets, corpus, setup store -> jsPsych timeline is ran

_As a npm package_

wherever the package is used -> index.js -> taskConfig.js -> load assets, corpus, setup store -> jsPsych timeline is ran

## How the task launcher works

The app can run in two different modes, and as such uses two different build processes. For standalone, the code is built with Webpack. As an `npm` package, the code is built with [Rollup](https://rollupjs.org/). They work fundamentally the same regardless of where they are run.

The TaskLauncher class takes in 4 parameters, 1 being optional. firekit, game params, user params, and the display element to attach the jsPsych code to. The display element is optional.

**As a Standalone web app**

As a standlone web app, the built code includes the `serve` folder. The entry point is in `serve.js`.
This folder also includes the config for Firestore.
`serve.js` includes some additional hooks (functions) from Firebase to check authentication.
In this mode, however, we do not use any authentication but treat the user as a guest.
The TaskLauncher class requires 3 things to run: firekit, user params, and game params. In standalone, we get all the parameters we need for the game from query strings.

**As a npm package (In development)**

As an npm package the packaged code does not include the serve folder.
You use it as you would any typical `npm` package:
Install it, import it, and run the code.
As with standalone deployment, it requires a firekit instance, game params, and user params.

```
Import TaskLauncher from 'core-tasks'

const task = new TaskLauncher(firekit, gameParams, userParams);
task.run();
```

### What is firekit?

[Firekit](https://github.com/yeatmanlab/roar-firekit) is an SDK developed by the ROAR team that allows for a streamlined interaction with Firestore and Firebase. It provides useful functions and tools for task development.

## Project structure

_Currently under development_

The overarching goal of this project is to simplify task developent, improve productivity, and decrease task development time. Previously, each task was in its own separate repo which led to a ton of WET ("Write Everything Twice" or in this case X times the amount of tasks) code.

Task specifc code lives in the task folder. Each child folder is named after it's respective task name.
Within that there is a `trials` folder containing `timeline.js`.
There may be additional helper functions in a `helper` directory.
Common code that is used throughout multiple tasks is in the `shared` directory.
This also has a `helpers` and a `trials` folder.
`taskSetup.js` defines global instances / variables that we need to pass all throughout the tasks.
`taskConfig.js` is where everything comes together for a task. There are 5 main parts to a task, the config, the store (you can think of this as global state), how to load the corpus (if the task needs it), where to get translations (TBD), and how to build the task timeline.

All of these parts in the task config file are ran after recieving the corresponding task name.

## Current Tasks & Parameters

In standalone web app mode, tasks and parameters can be changes through query strings. These query string parameters are listed below.

### Common Parameters

_Note: corpus is no longer a required parameter, each task has it's defaults_

```
task: 'egma-math' | 'matrix-reasoning' | 'mental-rotation' | 'hearts-and-flowers' | 'memory-game' | 'same-different-selection' | 'theory-of-mind' | 'trog' [string] (optional)
age: [number] (optional) ,
audioFeedback: "neutral" ['string'] (optional),
skipInstructions: [boolean] (optional),
sequentialPractice: [boolean] (optional)
sequentialStimulus: [boolean] (optional)
corpus: "*task-name-here*-item-bank" [string] (optional),
buttonLayout: "default" | "grid" | "column" | "diamond" | "triple" [string] (optional),
trials: [number] (optional),
stimulusBlocks: [number] (optional),
numOfPracticeTrials: [number] (optional),
maxIncorrect: [number] (optional),
maxTime: [number] (optional),
keyHelpers: [boolean] (optional)
```

### Math (includes Number Line) - Default

### Matrix Reasoning

### Mental Rotation

### Hearts and Flowers

### Memory Game

### Same Different Selection

### TROG

## Theory of Mind

## How ROAR / LEVANTE Tasks work within the greater ROAD infrastructure

[Data flow diagram](https://miro.com/app/board/uXjVNY-_qDA=/?share_link_id=967374624080)
