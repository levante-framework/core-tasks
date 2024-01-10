# Description
The tasks are all housed in this single repo using a monorepo like-structure. Which task is run is selected at run time based on the passed in parameters. This can be run standalone as a web app or as an npm package (in ROAD for example). The 'Task Launcher' is simply the name of the class that runs the whole app code.


## How the task launcher works
The app can run in two different modes, and as such uses two different build processes. For standalone, the code is built with Webpack. As an npm package, the code is built with Rollup. They work fundamentally the same regardless of where they are run. 

The TaskLauncher class takes in 4 parameters, 1 being optional. firekit, game params, user params, and the display element to attach the jsPsych code to. The display element is optional. 

*As a Standalone web app*
As a standlone web app, the built code includes the serve folder. The entry point is in serve.js. This folder also includes the config for Firestore. The serve.js file includes some additional hooks (functions) from Firebase to check the authentication. In this mode, however, we do not use any authentication but treat the user as a guest. The TaskLauncher class requires 3 things to run: firekit, user params, and game params. In standalone, we get all the parameters we need for the game from query strings. 



*As a npm package*
As an npm package the packaged code does not include the serve folder. You use it as you would any typical npm package. Install it, import it, and run the code. Just like standlone, it requires a firekit instance, game params, and user params. 

```
Import TaskLauncher from 'core-tasks'

const task = new TaskLauncher(firekit, gameParams, userParams);
task.run();
```

### What is firekit?
Firekit is an SDK developed by the ROAR team that allows for a streamlined interaction with Firestore and Firebase. It provides useful functions and tools for task development.


## Project structure
*Currently under development*
The overarching goal of this project is to simplify task developent, improve productivity, and decrease task development time. Previously, each task was in it's own seperate repo which led to a ton of WET ("Write Everything Twice" or in this case X times the amount of tasks) code.

Task specifc code lives in the task folder. Each child folder is named after it's respective task name. 

## How ROAR / LEVANTE Tasks work within the greater ROAD infrastructure
*Link to ROAD diagram*